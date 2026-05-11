import { formatDateTimeForDisplay } from "../utils/formatters";

/**
 * Logs page.
 * Shows records from waitlist_log.
 */
export default function LogsPage({ logs, loadingLogs, onRefresh }) {
  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Waitlist Logs</h1>
          <p>Review system actions performed by employees.</p>
        </div>

        <button className="btn btn-outline-secondary" onClick={onRefresh}>
          <i className="bi bi-arrow-clockwise me-2"></i>
          Refresh
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Activity Log</h5>
          {loadingLogs && <small className="text-muted">Loading...</small>}
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Log ID</th>
                <th>Entry ID</th>
                <th>Customer</th>
                <th>Action</th>
                <th>Notes</th>
                <th>Time</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr key={log.log_id}>
                  <td>{log.log_id}</td>
                  <td>{log.entry_id || "—"}</td>

                  <td>
                    {log.customer_first_name ? (
                      <>
                        <strong>
                          {log.customer_first_name} {log.customer_last_name}
                        </strong>
                        <br />
                        <small className="text-muted">
                          {log.email || log.phone_number || "No contact info"}
                        </small>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    <span className="badge bg-secondary">
                      {log.action_type}
                    </span>
                  </td>

                  <td>{log.notes || "—"}</td>
                  <td>{formatDateTimeForDisplay(log.occurrence_time)}</td>
                </tr>
              ))}

              {logs.length === 0 && !loadingLogs && (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No logs have been recorded yet.
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