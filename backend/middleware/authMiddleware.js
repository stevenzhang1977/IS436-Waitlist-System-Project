const jwt = require("jsonwebtoken");

/**
 * Authentication middleware.
 * It checks for an Authorization header in this format:
 * Authorization: Bearer <token>
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Access token is required",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev_secret_change_later"
    );

    /**
     * Store the logged-in staff info on req.staff.
     * Other routes can use req.staff.staff_id.
     */
    req.staff = decoded;

    next();
  } catch (error) {
    return res.status(403).json({
      message: "Invalid or expired token",
    });
  }
}

module.exports = authenticateToken;