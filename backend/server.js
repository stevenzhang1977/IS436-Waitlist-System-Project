const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const pool = require("./db");
const authRoutes = require("./routes/authRoutes");
const waitlistRoutes = require("./routes/waitlistRoutes");
const logRoutes = require("./routes/logRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const customerRoutes = require("./routes/customerRoutes");
const customerReservationRoutes = require("./routes/customerReservationRoutes");
const { setSocketServer } = require("./socket");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5055;

/**
 * Middleware
 * cors allows the React frontend to talk to this backend.
 * express.json allows the backend to read JSON request bodies.
 */
app.use(cors());
app.use(express.json());

/**
 * Socket.IO setup
 * This allows the backend to push real-time queue updates to all open dashboards.
 */
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

io.on("connection", (socket) => {
  console.log("Frontend connected to Socket.IO:", socket.id);

  socket.on("disconnect", () => {
    console.log("Frontend disconnected from Socket.IO:", socket.id);
  });
});

/**
 * Store the Socket.IO server instance so route files can emit updates.
 */
setSocketServer(io);

/**
 * Basic backend test route.
 */
app.get("/", (req, res) => {
  res.json({
    message: "Waitlist backend is running",
  });
});

/**
 * Health check route.
 * This confirms the backend can connect to MySQL.
 */
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "not connected",
      message: error.message,
    });
  }
});

/**
 * API route groups.
 * These keep server.js small and organized.
 */
app.use("/api/auth", authRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/customer/reservations", customerReservationRoutes);

/**
 * Start backend server.
 */
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
