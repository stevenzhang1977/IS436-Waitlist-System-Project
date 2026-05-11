const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * GET /api/logs
 * Returns waitlist activity logs.
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        wl.log_id,
        wl.entry_id,
        wl.action_type,
        wl.occurrence_time,
        wl.notes,
        we.party_size,
        c.first_name AS customer_first_name,
        c.last_name AS customer_last_name,
        c.phone_number,
        c.email
      FROM waitlist_log wl
      LEFT JOIN waitlist_entry we
        ON wl.entry_id = we.entry_id
      LEFT JOIN customer c
        ON we.customer_id = c.customer_id
      ORDER BY wl.occurrence_time DESC;
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error fetching logs:", error);

    res.status(500).json({
      message: "Failed to fetch logs",
      error: error.message,
    });
  }
});

module.exports = router;