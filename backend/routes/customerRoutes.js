const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * GET /api/customers
 * Returns all customers from the customer table.
 *
 * Your current customer table does not have a created_at column,
 * so this route does not select or order by created_at.
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        customer_id,
        first_name,
        last_name,
        phone_number,
        email,
        preferred_contact_method
      FROM customer
      ORDER BY customer_id DESC;
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error fetching customers:", error);

    res.status(500).json({
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
});

module.exports = router;