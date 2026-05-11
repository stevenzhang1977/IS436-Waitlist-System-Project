/**
 * This file stores the Socket.IO server instance.
 * Route files can call emitWaitlistUpdated() after database changes.
 */

let ioInstance = null;

/**
 * Saves the Socket.IO server instance from server.js.
 */
function setSocketServer(io) {
  ioInstance = io;
}

/**
 * Emits a real-time event to all connected frontend dashboards.
 */
function emitWaitlistUpdated() {
  if (ioInstance) {
    ioInstance.emit("waitlistUpdated");
  }
}

module.exports = {
  setSocketServer,
  emitWaitlistUpdated,
};