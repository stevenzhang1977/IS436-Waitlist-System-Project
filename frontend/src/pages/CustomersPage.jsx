/**
 * Customers page.
 * Displays customer records from the customer table.
 */
export default function CustomersPage({
  customers,
  loadingCustomers,
  onRefresh,
}) {
  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Customers</h1>
          <p>View customer records created through waitlist reservations.</p>
        </div>

        <button className="btn btn-outline-secondary" onClick={onRefresh}>
          <i className="bi bi-arrow-clockwise me-2"></i>
          Refresh
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Customer Records</h5>
          {loadingCustomers && <small className="text-muted">Loading...</small>}
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Customer ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Preferred Contact</th>
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr key={customer.customer_id}>
                  <td>{customer.customer_id}</td>

                  <td>
                    <strong>
                      {customer.first_name} {customer.last_name}
                    </strong>
                  </td>

                  <td>{customer.phone_number || "—"}</td>

                  <td>{customer.email || "—"}</td>

                  <td>
                    <span className="badge bg-info text-dark">
                      {customer.preferred_contact_method || "—"}
                    </span>
                  </td>
                </tr>
              ))}

              {customers.length === 0 && !loadingCustomers && (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    No customer records found.
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