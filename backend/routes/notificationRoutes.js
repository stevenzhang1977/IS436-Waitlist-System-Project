const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * GET /api/notifications
 * Returns notification history.
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        n.notification_id,
        n.entry_id,
        n.notification_type,
        n.notification_text,
        n.sent_at,
        n.delivery_status,
        we.party_size,
        c.first_name AS customer_first_name,
        c.last_name AS customer_last_name,
        c.phone_number,
        c.email
      FROM notification n
      LEFT JOIN waitlist_entry we
        ON n.entry_id = we.entry_id
      LEFT JOIN customer c
        ON we.customer_id = c.customer_id
      ORDER BY n.sent_at DESC;
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error fetching notifications:", error);

    res.status(500).json({
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
});

module.exports = router;