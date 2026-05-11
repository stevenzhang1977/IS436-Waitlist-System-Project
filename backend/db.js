const mysql = require("mysql2/promise");

/**
 * MySQL connection pool.
 * dateStrings: true prevents MySQL DATETIME values from being converted
 * into JavaScript Date objects, which can cause timezone shifting.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "waitlist_user",
  password: process.env.DB_PASSWORD || "waitlist_pass",
  database: process.env.DB_NAME || "waitlist_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

module.exports = pool;