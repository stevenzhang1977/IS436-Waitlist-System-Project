const express = require("express");
const crypto = require("crypto");
const pool = require("../db");
const { emitWaitlistUpdated } = require("../socket");

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
 * Generates a short reservation code.
 * Customers use this code to edit/cancel their reservation later.
 */
function generateReservationCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

/**
 * Uses active waitlist ordering to find queue position for an entry.
 * Returns 0 when entry is no longer in the active queue.
 */
async function getQueuePosition(db, entryId) {
  const [activeQueueRows] = await db.query(
    `
    SELECT we.entry_id
    FROM waitlist_entry we
    JOIN status s
      ON we.status_id = s.status_id
    WHERE s.status_name NOT IN ('Seated', 'Cancelled', 'No-Show')
    ORDER BY
      CASE
        WHEN we.requested_reservation_time IS NULL THEN 1
        ELSE 0
      END,
      we.requested_reservation_time ASC,
      we.created_at ASC;
    `
  );

  return activeQueueRows.findIndex((row) => row.entry_id === Number(entryId)) + 1;
}

/**
 * POST /api/customer/reservations
 * Public customer route.
 * Allows a customer to create their own reservation.
 */
router.post("/", async (req, res) => {
  const {
    first_name,
    last_name,
    phone_number,
    email,
    preferred_contact_method,
    party_size,
    requested_reservation_time,
    notes,
  } = req.body;

  if (!first_name || !last_name || !phone_number || !email || !party_size) {
    return res.status(400).json({
      message:
        "First name, last name, phone number, email, and party size are required.",
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const reservationCode = generateReservationCode();

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
        email,
        preferred_contact_method || "Email",
      ]
    );

    const customerId = customerResult.insertId;

    const [statusRows] = await connection.query(
      `
      SELECT status_id
      FROM status
      WHERE status_name = 'Waiting';
      `
    );

    const waitingStatusId = statusRows[0].status_id;

    /**
     * Use staff_id = 1 as a system/default staff user for public customer reservations.
     * Make sure staff_id 1 exists in your staff table.
     */
    const defaultStaffId = 1;

    const [entryResult] = await connection.query(
      `
      INSERT INTO waitlist_entry (
        customer_id,
        staff_id,
        status_id,
        party_size,
        requested_reservation_time,
        check_in_type,
        notes,
        reservation_code
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        customerId,
        defaultStaffId,
        waitingStatusId,
        Number(party_size),
        normalizeDateTime(requested_reservation_time),
        "Web-app",
        notes || null,
        reservationCode,
      ]
    );

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
        "Customer Created Reservation",
        `Customer created reservation through public web app.`,
      ]
    );

    const queuePosition = await getQueuePosition(connection, entryResult.insertId);

    await connection.commit();

    emitWaitlistUpdated();

    res.status(201).json({
      message: "Reservation created successfully.",
      entry_id: entryResult.insertId,
      reservation_code: reservationCode,
      queue_position: queuePosition,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Customer reservation create error:", error);

    res.status(500).json({
      message: "Failed to create reservation.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/customer/reservations/:id?code=XXXXXX
 * Allows customer to retrieve their reservation before editing.
 */
router.get("/:id", async (req, res) => {
  const entryId = req.params.id;
  const reservationCode = req.query.code;

  if (!reservationCode) {
    return res.status(400).json({
      message: "Reservation code is required.",
    });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT
        we.entry_id,
        we.party_size,
        we.requested_reservation_time,
        we.notes,
        s.status_name,
        c.first_name,
        c.last_name,
        c.phone_number,
        c.email,
        c.preferred_contact_method
      FROM waitlist_entry we
      JOIN customer c
        ON we.customer_id = c.customer_id
      JOIN status s
        ON we.status_id = s.status_id
      WHERE we.entry_id = ?
        AND we.reservation_code = ?;
      `,
      [entryId, reservationCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Reservation not found or code is incorrect.",
      });
    }

    const queuePosition = await getQueuePosition(pool, entryId);

    res.json({
      ...rows[0],
      queue_position: queuePosition,
    });
  } catch (error) {
    console.error("Customer reservation lookup error:", error);

    res.status(500).json({
      message: "Failed to load reservation.",
      error: error.message,
    });
  }
});

/**
 * PUT /api/customer/reservations/:id
 * Allows customer to edit their own reservation.
 */
router.put("/:id", async (req, res) => {
  const entryId = req.params.id;

  const {
    reservation_code,
    first_name,
    last_name,
    phone_number,
    email,
    preferred_contact_method,
    party_size,
    requested_reservation_time,
    notes,
  } = req.body;

  if (!reservation_code) {
    return res.status(400).json({
      message: "Reservation code is required.",
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [entryRows] = await connection.query(
      `
      SELECT customer_id
      FROM waitlist_entry
      WHERE entry_id = ?
        AND reservation_code = ?;
      `,
      [entryId, reservation_code]
    );

    if (entryRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Reservation not found or code is incorrect.",
      });
    }

    const customerId = entryRows[0].customer_id;

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
        email,
        preferred_contact_method || "Email",
        customerId,
      ]
    );

    await connection.query(
      `
      UPDATE waitlist_entry
      SET
        party_size = ?,
        requested_reservation_time = ?,
        notes = ?
      WHERE entry_id = ?;
      `,
      [
        Number(party_size),
        normalizeDateTime(requested_reservation_time),
        notes || null,
        entryId,
      ]
    );

    await connection.query(
      `
      INSERT INTO waitlist_log (
        entry_id,
        action_type,
        notes
      )
      VALUES (?, ?, ?);
      `,
      [entryId, "Customer Edited Reservation", "Customer updated reservation."]
    );

    await connection.commit();

    emitWaitlistUpdated();

    res.json({
      message: "Reservation updated successfully.",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Customer reservation update error:", error);

    res.status(500).json({
      message: "Failed to update reservation.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

/**
 * DELETE /api/customer/reservations/:id
 * Allows customer to cancel their own reservation.
 */
router.delete("/:id", async (req, res) => {
  const entryId = req.params.id;
  const { reservation_code } = req.body;

  if (!reservation_code) {
    return res.status(400).json({
      message: "Reservation code is required.",
    });
  }

  try {
    const [statusRows] = await pool.query(
      `
      SELECT status_id
      FROM status
      WHERE status_name = 'Cancelled';
      `
    );

    const cancelledStatusId = statusRows[0].status_id;

    const [result] = await pool.query(
      `
      UPDATE waitlist_entry
      SET status_id = ?
      WHERE entry_id = ?
        AND reservation_code = ?;
      `,
      [cancelledStatusId, entryId, reservation_code]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Reservation not found or code is incorrect.",
      });
    }

    await pool.query(
      `
      INSERT INTO waitlist_log (
        entry_id,
        action_type,
        notes
      )
      VALUES (?, ?, ?);
      `,
      [entryId, "Customer Cancelled Reservation", "Customer cancelled reservation."]
    );

    emitWaitlistUpdated();

    res.json({
      message: "Reservation cancelled successfully.",
    });
  } catch (error) {
    console.error("Customer reservation cancel error:", error);

    res.status(500).json({
      message: "Failed to cancel reservation.",
      error: error.message,
    });
  }
});

module.exports = router;
