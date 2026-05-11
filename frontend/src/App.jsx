import { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./App.css";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CustomerReservationPage from "./pages/CustomerReservationPage";

/**
 * Safely gets saved login data from localStorage.
 * Returns null if staff or token is missing.
 */
function getSavedAuth() {
  const savedStaff = localStorage.getItem("staff");
  const savedToken = localStorage.getItem("token");

  if (!savedStaff || !savedToken) {
    return null;
  }

  try {
    return {
      staff: JSON.parse(savedStaff),
      token: savedToken,
    };
  } catch (error) {
    localStorage.removeItem("staff");
    localStorage.removeItem("token");
    return null;
  }
}

export default function App() {
  /**
   * Load saved login on page refresh.
   */
  const savedAuth = getSavedAuth();

  const [staff, setStaff] = useState(savedAuth ? savedAuth.staff : null);

  /**
   * If saved login exists, start on admin.
   * Otherwise, start on customer-facing page.
   */
  const [view, setView] = useState(savedAuth ? "admin" : "customer");

  /**
   * Runs after successful employee login.
   */
  function handleLogin(staffData, token) {
    localStorage.setItem("staff", JSON.stringify(staffData));
    localStorage.setItem("token", token);

    setStaff(staffData);
    setView("admin");
  }

  /**
   * Logs out employee.
   */
  function handleLogout() {
    localStorage.removeItem("staff");
    localStorage.removeItem("token");

    setStaff(null);
    setView("customer");
  }

  /**
   * Customer-facing reservation page.
   */
  if (view === "customer") {
    return (
      <CustomerReservationPage
        goToEmployeeLogin={() => setView(staff ? "admin" : "login")}
      />
    );
  }

  /**
   * Employee login page.
   */
  if (view === "login" || !staff) {
    return <LoginPage onLogin={handleLogin} />;
  }

  /**
   * Admin dashboard.
   */
  return (
    <DashboardPage
      staff={staff}
      onLogout={handleLogout}
      goToReservationPage={() => setView("customer")}
    />
  );
}
