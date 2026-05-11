const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const { emitWaitlistUpdated } = require("../socket");
const { sendReadyEmail } = require("../services/mailjetService");

const router = express.Router();

/**
 * Converts datetime-local input into MySQL DATETIME format.
 * Example: 2026-05-08T14:40 -> 2026-05-08 14:40:00
 */
function normalizeDateTime(value) {
  if (!value) return null;

  return value.replace("T", " ") + ":00";
}

/**
 * GET /api/waitlist
 * Returns active waitlist entries.
 * Seated, Cancelled, and No-Show entries are hidden from the active queue.
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        we.entry_id,
        we.customer_id,
        we.staff_id,
        c.first_name,
        c.last_name,
        c.phone_number,
        c.email,
        c.preferred_contact_method,
        we.party_size,
        we.requested_reservation_time,
        we.check_in_type,
        we.notes,
        we.created_at,
        s.status_id,
        s.status_name,
        st.first_name AS staff_first_name,
        st.last_name AS staff_last_name
      FROM waitlist_entry we
      JOIN customer c
        ON we.customer_id = c.customer_id
      JOIN status s
        ON we.status_id = s.status_id
      JOIN staff st
        ON we.staff_id = st.staff_id
      WHERE s.status_name NOT IN ('Seated', 'Cancelled', 'No-Show')
      ORDER BY
        CASE 
          WHEN we.requested_reservation_time IS NULL THEN 1 
          ELSE 0 
        END,
        we.requested_reservation_time ASC,
        we.created_at ASC;;
    `);

    /**
     * Queue position is calculated dynamically.
     * We do not need to store queue_position in the database.
     */
    const waitlist = rows.map((row, index) => ({
      queue_position: index + 1,
      entry_id: row.entry_id,
      customer_id: row.customer_id,
      staff_id: row.staff_id,
      first_name: row.first_name,
      last_name: row.last_name,
      phone_number: row.phone_number,
      email: row.email,
      preferred_contact_method: row.preferred_contact_method,
      party_size: row.party_size,
      requested_reservation_time: row.requested_reservation_time,
      check_in_type: row.check_in_type,
      notes: row.notes,
      created_at: row.created_at,
      status_id: row.status_id,
      status_name: row.status_name,
      staff_name:
        row.check_in_type === "Web-app"
          ? "Customer Web App"
          : `${row.staff_first_name} ${row.staff_last_name}`,
    }));

    res.json(waitlist);
  } catch (error) {
    console.error("Error fetching waitlist:", error);

    res.status(500).json({
      message: "Failed to fetch waitlist",
      error: error.message,
    });
  }
});

/**
 * POST /api/waitlist
 * Adds a new customer and waitlist entry.
 */
router.post("/", authenticateToken, async (req, res) => {
  const {
    first_name,
    last_name,
    phone_number,
    email,
    preferred_contact_method,
    party_size,
    requested_reservation_time,
    check_in_type,
    notes,
  } = req.body;

  /**
   * The logged-in staff ID comes from the JWT token.
   * The frontend should not choose staff_id manually.
   */
  const staff_id = req.staff.staff_id;

  if (
    !first_name ||
    !last_name ||
    !phone_number ||
    !preferred_contact_method ||
    !party_size
  ) {
    return res.status(400).json({
      message:
        "First name, last name, phone number, preferred contact method, and party size are required",
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    /**
     * First create the customer record.
     */
    const [customerResult] = await connection.query(
      `
      INSERT INTO customer (
        first_name,
        last_name,
        phone_number,
        email,
        preferred_contact_method
      )
      VALUES (?, ?, ?, ?, ?);
      `,
      [
        first_name,
        last_name,
        phone_number,
        email || null,
        preferred_contact_method || "Email",
      ]
    );

    const customerId = customerResult.insertId;

    /**
     * Find the Waiting status ID.
     */
    const [statusRows] = await connection.query(
      `
      SELECT status_id
      FROM status
      WHERE status_name = 'Waiting';
      `
    );

    if (statusRows.length === 0) {
      await connection.rollback();

      return res.status(500).json({
        message: "Waiting status does not exist in status table",
      });
    }

    const waitingStatusId = statusRows[0].status_id;

    /**
     * Create the waitlist entry.
     */
    const [entryResult] = await connection.query(
      `
      INSERT INTO waitlist_entry (
        customer_id,
        staff_id,
        status_id,
        party_size,
        requested_reservation_time,
        check_in_type,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?);
      `,
      [
        customerId,
        staff_id,
        waitingStatusId,
        Number(party_size),
        normalizeDateTime(requested_reservation_time),
        check_in_type || "Walk-in",
        notes || null,
      ]
    );

    /**
     * Record the action in the log table.
     */
    await connection.query(
      `
      INSERT INTO waitlist_log (
        entry_id,
        action_type,
        notes
      )
      VALUES (?, ?, ?);
      `,
      [
        entryResult.insertId,
        "Created",
        `Reservation created for ${first_name} ${last_name}`,
      ]
    );

    await connection.commit();

    /**
     * Push real-time update to all dashboards.
     */
    emitWaitlistUpdated();

    res.status(201).json({
      message: "Reservation added successfully",
      entry_id: entryResult.insertId,
      customer_id: customerId,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Error adding reservation:", error);

    res.status(500).json({
      message: "Failed to add reservation",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

/**
 * PUT /api/waitlist/:id
 * Edits an existing reservation and customer info.
 */
router.put("/:id", authenticateToken, async (req, res) => {
  const entryId = req.params.id;

  const {
    first_name,
    last_name,
    phone_number,
    email,
    preferred_contact_method,
    party_size,
    requested_reservation_time,
    check_in_type,
    notes,
  } = req.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    /**
     * Get the customer attached to this waitlist entry.
     */
    const [entryRows] = await connection.query(
      `
      SELECT customer_id
      FROM waitlist_entry
      WHERE entry_id = ?;
      `,
      [entryId]
    );

    if (entryRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Reservation not found",
      });
    }

    const customerId = entryRows[0].customer_id;

    /**
     * Update customer details.
     */
    await connection.query(
      `
      UPDATE customer
      SET
        first_name = ?,
        last_name = ?,
        phone_number = ?,
        email = ?,
        preferred_contact_method = ?
      WHERE customer_id = ?;
      `,
      [
        first_name,
        last_name,
        phone_number,
        email || null,
        preferred_contact_method || "Email",
        customerId,
      ]
    );

    /**
     * Update waitlist details.
     */
    await connection.query(
      `
      UPDATE waitlist_entry
      SET
        party_size = ?,
        requested_reservation_time = ?,
        check_in_type = ?,
        notes = ?
      WHERE entry_id = ?;
      `,
      [
        Number(party_size),
        normalizeDateTime(requested_reservation_time),
        check_in_type || "Walk-in",
        notes || null,
        entryId,
      ]
    );

    /**
     * Add edit log record.
     */
    await connection.query(
      `
      INSERT INTO waitlist_log (
        entry_id,
        action_type,
        notes
      )
      VALUES (?, ?, ?);
      `,
      [entryId, "Edited", "Reservation details updated"]
    );

    await connection.commit();

    emitWaitlistUpdated();

    res.json({
      message: "Reservation updated successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Error editing reservation:", error);

    res.status(500).json({
      message: "Failed to edit reservation",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

/**
 * PATCH /api/waitlist/:id/status
 * Updates reservation status, such as Ready or Seated.
 */
router.patch("/:id/status", authenticateToken, async (req, res) => {
  const entryId = req.params.id;
  const { status_name } = req.body;

  if (!status_name) {
    return res.status(400).json({
      message: "status_name is required",
    });
  }

  try {
    /**
     * Convert status name to status_id.
     */
    const [statusRows] = await pool.query(
      `
      SELECT status_id
      FROM status
      WHERE status_name = ?;
      `,
      [status_name]
    );

    if (statusRows.length === 0) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const statusId = statusRows[0].status_id;

    /**
     * Update the waitlist entry status.
     */
    const [result] = await pool.query(
      `
      UPDATE waitlist_entry
      SET status_id = ?
      WHERE entry_id = ?;
      `,
      [statusId, entryId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Reservation not found",
      });
    }

    /**
     * Log the status change.
     */
    await pool.query(
      `
      INSERT INTO waitlist_log (
        entry_id,
        action_type,
        notes
      )
      VALUES (?, ?, ?);
      `,
      [entryId, "Status Updated", `Changed status to ${status_name}`]
    );

    emitWaitlistUpdated();

    res.json({
      message: "Status updated successfully",
    });
  } catch (error) {
    console.error("Error updating status:", error);

    res.status(500).json({
      message: "Failed to update status",
      error: error.message,
    });
  }
});

/**
 * POST /api/waitlist/:id/notify
 * Sends an email notification through Mailjet.
 * Then updates the status to Notified, records notification, and logs the action.
 */
router.post("/:id/notify", authenticateToken, async (req, res) => {
  const entryId = req.params.id;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    /**
     * Get the reservation and customer email.
     */
    const [rows] = await connection.query(
      `
      SELECT
        we.entry_id,
        c.first_name,
        c.last_name,
        c.email,
        c.preferred_contact_method,
        s.status_name
      FROM waitlist_entry we
      JOIN customer c
        ON we.customer_id = c.customer_id
      JOIN status s
        ON we.status_id = s.status_id
      WHERE we.entry_id = ?;
      `,
      [entryId]
    );

    if (rows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Reservation not found",
      });
    }

    const reservation = rows[0];

    if (!reservation.email) {
      await connection.rollback();

      return res.status(400).json({
        message: "Customer does not have an email address",
      });
    }

    /**
     * Send the email using Mailjet service.
     */
    const { deliveryStatus, messageId, notificationText } =
      await sendReadyEmail(reservation);

    /**
     * Find Notified status ID.
     */
    const [statusRows] = await connection.query(
      `
      SELECT status_id
      FROM status
      WHERE status_name = 'Notified';
      `
    );

    if (statusRows.length === 0) {
      await connection.rollback();

      return res.status(500).json({
        message: "Notified status does not exist in status table",
      });
    }

    const notifiedStatusId = statusRows[0].status_id;

    /**
     * Update waitlist status to Notified.
     */
    await connection.query(
      `
      UPDATE waitlist_entry
      SET status_id = ?
      WHERE entry_id = ?;
      `,
      [notifiedStatusId, entryId]
    );

    /**
     * Insert notification history.
     * Keep delivery_status short: Sent, Failed, Not Sent, Pending.
     */
    await connection.query(
      `
      INSERT INTO notification (
        entry_id,
        notification_type,
        notification_text,
        delivery_status
      )
      VALUES (?, ?, ?, ?);
      `,
      [entryId, "Email", notificationText, deliveryStatus]
    );

    /**
     * Store detailed API info in the log notes instead.
     */
    await connection.query(
      `
      INSERT INTO waitlist_log (
        entry_id,
        action_type,
        notes
      )
      VALUES (?, ?, ?);
      `,
      [
        entryId,
        "Customer Notified",
        messageId
          ? `Email notification status: ${deliveryStatus}. Mailjet Message ID: ${messageId}`
          : `Email notification status: ${deliveryStatus}`,
      ]
    );

    await connection.commit();

    emitWaitlistUpdated();

    res.json({
      message:
        deliveryStatus === "Sent"
          ? "Customer notified by email successfully"
          : "Notification recorded, but email was not sent",
      delivery_status: deliveryStatus,
      mailjet_message_id: messageId,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Error notifying customer by email:", error);

    res.status(500).json({
      message: "Failed to notify customer by email",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

/**
 * DELETE /api/waitlist/:id
 * Soft-deletes a reservation by changing status to Cancelled.
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  const entryId = req.params.id;

  try {
    /**
     * Find Cancelled status ID.
     */
    const [statusRows] = await pool.query(
      `
      SELECT status_id
      FROM status
      WHERE status_name = 'Cancelled';
      `
    );

    if (statusRows.length === 0) {
      return res.status(500).json({
        message: "Cancelled status does not exist in status table",
      });
    }

    const cancelledStatusId = statusRows[0].status_id;

    /**
     * Change entry status to Cancelled.
     */
    const [result] = await pool.query(
      `
      UPDATE waitlist_entry
      SET status_id = ?
      WHERE entry_id = ?;
      `,
      [cancelledStatusId, entryId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Reservation not found",
      });
    }

    /**
     * Add cancellation log.
     */
    await pool.query(
      `
      INSERT INTO waitlist_log (
        entry_id,
        action_type,
        notes
      )
      VALUES (?, ?, ?);
      `,
      [entryId, "Cancelled", "Reservation cancelled from dashboard"]
    );

    emitWaitlistUpdated();

    res.json({
      message: "Reservation cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling reservation:", error);

    res.status(500).json({
      message: "Failed to cancel reservation",
      error: error.message,
    });
  }
});

module.exports = router;