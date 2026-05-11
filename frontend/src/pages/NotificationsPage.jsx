import {
  formatDateTimeForDisplay,
  getDeliveryStatusBadge,
} from "../utils/formatters";

/**
 * Notifications page.
 * Shows email notifications sent to customers.
 */
export default function NotificationsPage({
  notifications,
  loadingNotifications,
  onRefresh,
}) {
  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Notifications</h1>
          <p>Review customer notification history.</p>
        </div>

        <button className="btn btn-outline-secondary" onClick={onRefresh}>
          <i className="bi bi-arrow-clockwise me-2"></i>
          Refresh
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Notification History</h5>
          {loadingNotifications && (
            <small className="text-muted">Loading...</small>
          )}
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Notification ID</th>
                <th>Entry ID</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Message</th>
                <th>Status</th>
                <th>Sent At</th>
              </tr>
            </thead>

            <tbody>
              {notifications.map((notification) => (
                <tr key={notification.notification_id}>
                  <td>{notification.notification_id}</td>
                  <td>{notification.entry_id || "—"}</td>

                  <td>
                    {notification.customer_first_name ? (
                      <>
                        <strong>
                          {notification.customer_first_name}{" "}
                          {notification.customer_last_name}
                        </strong>
                        <br />
                        <small className="text-muted">
                          {notification.email ||
                            notification.phone_number ||
                            "No contact info"}
                        </small>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    <span className="badge bg-info text-dark">
                      {notification.notification_type}
                    </span>
                  </td>

                  <td className="notification-message">
                    {notification.notification_text || "—"}
                  </td>

                  <td>
                    <span
                      className={`badge ${getDeliveryStatusBadge(
                        notification.delivery_status
                      )}`}
                    >
                      {notification.delivery_status}
                    </span>
                  </td>

                  <td>{formatDateTimeForDisplay(notification.sent_at)}</td>
                </tr>
              ))}

              {notifications.length === 0 && !loadingNotifications && (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-4">
                    No notifications have been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}