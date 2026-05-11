const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

/**
 * POST /api/auth/login
 * Logs in an employee by checking the staff table.
 */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: "Username and password are required",
    });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        staff_id,
        first_name,
        last_name,
        username,
        password_hashed
      FROM staff
      WHERE username = ?;
      `,
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    const staff = rows[0];

    /**
     * Compare the typed password with the bcrypt hash stored in MySQL.
     */
    const passwordMatches = await bcrypt.compare(
      password,
      staff.password_hashed
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    /**
     * Create a JWT token that expires after 8 hours.
     */
    const token = jwt.sign(
      {
        staff_id: staff.staff_id,
        username: staff.username,
        first_name: staff.first_name,
        last_name: staff.last_name,
      },
      process.env.JWT_SECRET || "dev_secret_change_later",
      {
        expiresIn: "8h",
      }
    );

    res.json({
      message: "Login successful",
      token,
      staff: {
        staff_id: staff.staff_id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        username: staff.username,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
});

module.exports = router;