import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import { API_URL, SOCKET_URL, getAuthHeaders } from "../api";
import Sidebar from "../components/Sidebar";
import WaitlistPage from "./WaitlistPage";
import LogsPage from "./LogsPage";
import NotificationsPage from "./NotificationsPage";
import CustomersPage from "./CustomersPage";

/**
 * Main dashboard layout.
 * This component controls the active sidebar page and loads shared data.
 */
export default function DashboardPage({ staff, onLogout, goToReservationPage }) {
  const [activePage, setActivePage] = useState("waitlist");

  const [reservations, setReservations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loadingWaitlist, setLoadingWaitlist] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  /**
   * Loads active waitlist entries from the backend.
   */
  async function loadWaitlist() {
    setLoadingWaitlist(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/waitlist`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load waitlist");
      }

      setReservations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingWaitlist(false);
    }
  }

  /**
   * Loads system activity logs from the backend.
   */
  async function loadLogs() {
    setLoadingLogs(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/logs`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load logs");
      }

      setLogs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingLogs(false);
    }
  }

  /**
   * Loads email notification history from the backend.
   */
  async function loadNotifications() {
    setLoadingNotifications(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/notifications`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load notifications");
      }

      setNotifications(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingNotifications(false);
    }
  }

  /**
 * Loads customer records from the backend.
 */
async function loadCustomers() {
  setLoadingCustomers(true);
  setError("");

  try {
    const response = await fetch(`${API_URL}/api/customers`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load customers");
    }

    setCustomers(data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoadingCustomers(false);
  }
}

  /**
   * Initial data load and Socket.IO setup.
   * Whenever waitlistUpdated is emitted by the backend,
   * all connected dashboards reload data automatically.
   */
  useEffect(() => {
    loadWaitlist();
    loadLogs();
    loadNotifications();
    loadCustomers();

    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log("Connected to Socket.IO:", socket.id);
    });

    socket.on("waitlistUpdated", () => {
      loadWaitlist();
      loadLogs();
      loadNotifications();
      loadCustomers();
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar
        staff={staff}
        activePage={activePage}
        setActivePage={setActivePage}
        onLogout={onLogout}
        goToReservationPage={goToReservationPage}
        loadLogs={loadLogs}
        loadNotifications={loadNotifications}
        loadCustomers={loadCustomers}
      />

      <main className="main-content">
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        {activePage === "waitlist" && (
          <WaitlistPage
            reservations={reservations}
            loadingWaitlist={loadingWaitlist}
            loadWaitlist={loadWaitlist}
            loadLogs={loadLogs}
            loadNotifications={loadNotifications}
            setMessage={setMessage}
            setError={setError}
          />
        )}

        {activePage === "logs" && (
          <LogsPage logs={logs} loadingLogs={loadingLogs} onRefresh={loadLogs} />
        )}

        {activePage === "notifications" && (
          <NotificationsPage
            notifications={notifications}
            loadingNotifications={loadingNotifications}
            onRefresh={loadNotifications}
          />
        )}

        {activePage === "customers" && (
          <CustomersPage
            customers={customers}
            loadingCustomers={loadingCustomers}
            onRefresh={loadCustomers}
          />
        )}
      </main>
    </div>
  );
}
