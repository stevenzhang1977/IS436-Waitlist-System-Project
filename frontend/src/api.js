/**
 * Backend API URL.
 * In Docker, this should come from VITE_API_URL in docker-compose.yml.
 */
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5055";

/**
 * Socket.IO URL.
 * This is used for real-time waitlist updates.
 */
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5055";

/**
 * Creates headers for protected backend routes.
 * The backend expects:
 * Authorization: Bearer <token>
 */
export function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
