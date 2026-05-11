/**
 * Sidebar navigation for the employee dashboard.
 * activePage decides which page is currently displayed.
 */
export default function Sidebar({
  staff,
  activePage,
  setActivePage,
  onLogout,
  goToReservationPage,
  loadLogs,
  loadNotifications,
  loadCustomers,
}) {
  return (
    <aside className="sidebar">
      <button className="sidebar-brand" onClick={goToReservationPage}>
        Sunset Tea
      </button>

      <nav>
        <button
          className={
            activePage === "waitlist"
              ? "active sidebar-nav-button"
              : "sidebar-nav-button"
          }
          onClick={() => setActivePage("waitlist")}
        >
          <i className="bi bi-list-check me-2"></i>
          Waitlist
        </button>

        <button
          className={
            activePage === "logs"
              ? "active sidebar-nav-button"
              : "sidebar-nav-button"
          }
          onClick={() => {
            setActivePage("logs");
            loadLogs();
          }}
        >
          <i className="bi bi-clock-history me-2"></i>
          Logs
        </button>

        <button
          className={
            activePage === "notifications"
              ? "active sidebar-nav-button"
              : "sidebar-nav-button"
          }
          onClick={() => {
            setActivePage("notifications");
            loadNotifications();
          }}
        >
          <i className="bi bi-bell me-2"></i>
          Notifications
        </button>

        <button
          className={
            activePage === "customers"
              ? "active sidebar-nav-button"
              : "sidebar-nav-button"
          }
          onClick={() => {
            setActivePage("customers");
            loadCustomers();
          }}
        >
          <i className="bi bi-people me-2"></i>
          Customers
        </button>
      </nav>

      <div className="sidebar-user">
        <small>Logged in as</small>
        <strong>
          {staff.first_name} {staff.last_name}
        </strong>
      </div>

      <button className="logout-btn" onClick={onLogout}>
        <i className="bi bi-box-arrow-right me-2"></i>
        Logout
      </button>
    </aside>
  );
}
