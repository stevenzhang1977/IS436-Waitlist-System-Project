import { useState } from "react";
import { API_URL, getAuthHeaders } from "../api";
import {
  formatDateTimeForDisplay,
  formatDateTimeForInput,
  getBadgeClass,
} from "../utils/formatters";

/**
 * Waitlist page.
 * Allows employees to add, edit, notify, seat, and cancel reservations.
 */
export default function WaitlistPage({
  reservations,
  loadingWaitlist,
  loadWaitlist,
  loadLogs,
  loadNotifications,
  setMessage,
  setError,
}) {
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
    preferred_contact_method: "Email",
    party_size: 1,
    requested_reservation_time: "",
    check_in_type: "Walk-in",
    notes: "",
  });

  /**
   * Add a reservation or update an existing reservation.
   */
  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    const payload = {
      ...form,
      party_size: Number(form.party_size),
    };

    try {
      const url = editingId
        ? `${API_URL}/api/waitlist/${editingId}`
        : `${API_URL}/api/waitlist`;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save reservation");
      }

      setMessage(editingId ? "Reservation updated." : "Reservation added.");

      resetForm();

      await loadWaitlist();
      await loadLogs();
    } catch (err) {
      setError(err.message);
    }
  }

  /**
   * Fill the form with selected reservation data.
   */
  function startEdit(reservation) {
    setEditingId(reservation.entry_id);

    setForm({
      first_name: reservation.first_name || "",
      last_name: reservation.last_name || "",
      phone_number: reservation.phone_number || "",
      email: reservation.email || "",
      preferred_contact_method: reservation.preferred_contact_method || "Email",
      party_size: reservation.party_size || 1,
      requested_reservation_time: formatDateTimeForInput(
        reservation.requested_reservation_time
      ),
      check_in_type: reservation.check_in_type || "Walk-in",
      notes: reservation.notes || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /**
   * Clear add/edit form.
   */
  function resetForm() {
    setEditingId(null);

    setForm({
      first_name: "",
      last_name: "",
      phone_number: "",
      email: "",
      preferred_contact_method: "Email",
      party_size: 1,
      requested_reservation_time: "",
      check_in_type: "Walk-in",
      notes: "",
    });
  }

  /**
   * Update reservation status.
   */
  async function updateStatus(entryId, statusName) {
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/waitlist/${entryId}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status_name: statusName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update status");
      }

      setMessage(`Reservation marked as ${statusName}.`);

      await loadWaitlist();
      await loadLogs();
    } catch (err) {
      setError(err.message);
    }
  }

  /**
   * Notify the customer by email.
   */
  async function notifyCustomer(entryId) {
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/waitlist/${entryId}/notify`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to notify customer");
      }

      setMessage(data.message);

      await loadWaitlist();
      await loadLogs();
      await loadNotifications();
    } catch (err) {
      setError(err.message);
    }
  }

  /**
   * Cancel a reservation.
   */
  async function deleteReservation(entryId) {
    const confirmed = window.confirm(
      "Are you sure you want to cancel/delete this reservation?"
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/waitlist/${entryId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete reservation");
      }

      setMessage("Reservation cancelled.");

      await loadWaitlist();
      await loadLogs();
    } catch (err) {
      setError(err.message);
    }
  }

  const waitingCount = reservations.filter(
    (r) => r.status_name === "Waiting"
  ).length;

  const notifiedCount = reservations.filter(
    (r) => r.status_name === "Notified"
  ).length;

  const readyCount = reservations.filter(
    (r) => r.status_name === "Ready"
  ).length;

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Waitlist Dashboard</h1>
          <p>Manage the current customer queue.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="summary-card">
            <p>Current Queue</p>
            <h2>{reservations.length}</h2>
          </div>
        </div>

        <div className="col-md-3">
          <div className="summary-card">
            <p>Waiting</p>
            <h2>{waitingCount}</h2>
          </div>
        </div>

        <div className="col-md-3">
          <div className="summary-card">
            <p>Notified</p>
            <h2>{notifiedCount}</h2>
          </div>
        </div>

        <div className="col-md-3">
          <div className="summary-card">
            <p>Ready</p>
            <h2>{readyCount}</h2>
          </div>
        </div>
      </div>

      {/* Add/Edit form */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            {editingId ? "Edit Reservation" : "Add Reservation"}
          </h5>

          {editingId && (
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={resetForm}
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">First Name</label>
                <input
                  className="form-control"
                  value={form.first_name}
                  onChange={(e) =>
                    setForm({ ...form, first_name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Last Name</label>
                <input
                  className="form-control"
                  value={form.last_name}
                  onChange={(e) =>
                    setForm({ ...form, last_name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Phone Number</label>
                <input
                  className="form-control"
                  value={form.phone_number}
                  onChange={(e) =>
                    setForm({ ...form, phone_number: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Preferred Contact</label>
                <select
                  className="form-select"
                  value={form.preferred_contact_method}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      preferred_contact_method: e.target.value,
                    })
                  }
                >
                  <option value="Email">Email</option>
                  <option value="Text">Text</option>
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label">Party Size</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={form.party_size}
                  onChange={(e) =>
                    setForm({ ...form, party_size: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Reservation Time</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={form.requested_reservation_time}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      requested_reservation_time: e.target.value,
                    })
                  }
                />
              </div>

              <div className="col-md-2">
                <label className="form-label">Check-In Type</label>
                <select
                  className="form-select"
                  value={form.check_in_type}
                  onChange={(e) =>
                    setForm({ ...form, check_in_type: e.target.value })
                  }
                >
                  <option value="Walk-in">Walk-in</option>
                  <option value="Text">Text</option>
                  <option value="Web-app">Web-app</option>
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label">Notes</label>
                <input
                  className="form-control"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="col-12">
                <button className="btn btn-primary">
                  {editingId ? "Save Changes" : "Add Reservation"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Waitlist table */}
      <div className="card shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Current Queue</h5>
          <div className="d-flex align-items-center gap-2">
            {loadingWaitlist && <small className="text-muted">Loading...</small>}

            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={loadWaitlist}
              title="Refresh queue"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Position</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Party Size</th>
                <th>Status</th>
                <th>Check-In</th>
                <th>Reservation Time</th>
                <th>Notes</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>

            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.entry_id}>
                  <td>
                    <span className="queue-position">
                      {reservation.queue_position}
                    </span>
                  </td>

                  <td>
                    <strong>
                      {reservation.first_name} {reservation.last_name}
                    </strong>
                    <br />
                    <small className="text-muted">
                      Added by {reservation.staff_name}
                    </small>
                  </td>

                  <td>
                    <div>{reservation.phone_number}</div>
                    <small className="text-muted">
                      {reservation.email || "No email"}
                    </small>
                  </td>

                  <td>{reservation.party_size}</td>

                  <td>
                    <span
                      className={`badge ${getBadgeClass(
                        reservation.status_name
                      )}`}
                    >
                      {reservation.status_name}
                    </span>
                  </td>

                  <td>{reservation.check_in_type}</td>

                  <td>
                    {reservation.requested_reservation_time
                      ? formatDateTimeForDisplay(
                          reservation.requested_reservation_time
                        )
                      : "—"}
                  </td>

                  <td>{reservation.notes || "—"}</td>

                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-primary me-1"
                      onClick={() => startEdit(reservation)}
                    >
                      Edit
                    </button>

                    <button
                      className="btn btn-sm btn-outline-info me-1"
                      onClick={() => notifyCustomer(reservation.entry_id)}
                    >
                      Notify Email
                    </button>

                    <button
                      className="btn btn-sm btn-outline-success me-1"
                      onClick={() =>
                        updateStatus(reservation.entry_id, "Ready")
                      }
                    >
                      Ready
                    </button>

                    <button
                      className="btn btn-sm btn-outline-dark me-1"
                      onClick={() =>
                        updateStatus(reservation.entry_id, "Seated")
                      }
                    >
                      Seat
                    </button>

                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => deleteReservation(reservation.entry_id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {reservations.length === 0 && !loadingWaitlist && (
                <tr>
                  <td colSpan="9" className="text-center text-muted py-4">
                    No customers are currently waiting.
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