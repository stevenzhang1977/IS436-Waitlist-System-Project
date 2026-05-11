import { useState } from "react";
import { API_URL } from "../api";
import { formatDateTimeForInput } from "../utils/formatters";
import sunsetCafeBg from "../assets/sunset-cafe.webp";

/**
 * Public customer reservation page.
 * Customers do not need employee login.
 */
export default function CustomerReservationPage({ goToEmployeeLogin }) {
  const [mode, setMode] = useState("create");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [queueInfo, setQueueInfo] = useState(null);

  const [lookup, setLookup] = useState({
    entry_id: "",
    reservation_code: "",
  });

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
    preferred_contact_method: "Email",
    party_size: 1,
    requested_reservation_time: "",
    notes: "",
    reservation_code: "",
    entry_id: "",
  });

  function updateForm(field, value) {
    setForm({
      ...form,
      [field]: value,
    });
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function updateLookup(field, value) {
    setLookup({
      ...lookup,
      [field]: value,
    });
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function getEstimatedWait(position) {
    if (!position || position < 1) {
      return "Ready / No wait";
    }

    const minMinutes = Math.max(5, (position - 1) * 5);
    const maxMinutes = minMinutes + 10;
    return `${minMinutes}-${maxMinutes} mins`;
  }

  function validatePhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, "");
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  function validateCreateOrEditForm() {
    const nextErrors = {};

    if (!validatePhoneNumber(form.phone_number)) {
      nextErrors.phone_number =
        "Phone number must contain 10 to 15 digits.";
    }

    if (form.party_size < 1) {
      nextErrors.party_size = "Party size must be at least 1.";
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setError("Please fix the highlighted fields and try again.");
      return false;
    }

    return true;
  }

  function validateLookupForm() {
    const nextErrors = {};

    if (!lookup.entry_id || Number(lookup.entry_id) < 1) {
      nextErrors.entry_id = "Reservation ID must be a valid number.";
    }

    if (!lookup.reservation_code.trim()) {
      nextErrors.reservation_code = "Reservation code is required.";
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setError("Please fix the highlighted fields and try again.");
      return false;
    }

    return true;
  }

  async function createReservation(e) {
    e.preventDefault();

    setMessage("");
    setError("");
    setFieldErrors({});

    if (!validateCreateOrEditForm()) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/customer/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          phone_number: form.phone_number,
          email: form.email,
          preferred_contact_method: form.preferred_contact_method,
          party_size: Number(form.party_size),
          requested_reservation_time: form.requested_reservation_time,
          notes: form.notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create reservation.");
      }

      setMessage(
        `Reservation created. Your queue position is #${data.queue_position}. Save this information: Reservation ID ${data.entry_id}, Code ${data.reservation_code}`
      );
      setQueueInfo({
        customerName: `${form.first_name} ${form.last_name}`,
        queuePosition: data.queue_position,
        estimatedWait: getEstimatedWait(data.queue_position),
      });

      setForm({
        ...form,
        entry_id: data.entry_id,
        reservation_code: data.reservation_code,
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function findReservation(e) {
    e.preventDefault();

    setMessage("");
    setError("");
    setFieldErrors({});

    if (!validateLookupForm()) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/customer/reservations/${lookup.entry_id}?code=${lookup.reservation_code}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to find reservation.");
      }

      setForm({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        phone_number: data.phone_number || "",
        email: data.email || "",
        preferred_contact_method: data.preferred_contact_method || "Email",
        party_size: data.party_size || 1,
        requested_reservation_time: formatDateTimeForInput(
          data.requested_reservation_time
        ),
        notes: data.notes || "",
        entry_id: lookup.entry_id,
        reservation_code: lookup.reservation_code,
      });

      setMode("edit");
      setMessage("Reservation found. You can now edit or cancel it.");
      setQueueInfo({
        customerName: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
        queuePosition: data.queue_position,
        estimatedWait: getEstimatedWait(data.queue_position),
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateReservation(e) {
    e.preventDefault();

    setMessage("");
    setError("");
    setFieldErrors({});

    if (!validateCreateOrEditForm()) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/customer/reservations/${form.entry_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reservation_code: form.reservation_code,
            first_name: form.first_name,
            last_name: form.last_name,
            phone_number: form.phone_number,
            email: form.email,
            preferred_contact_method: form.preferred_contact_method,
            party_size: Number(form.party_size),
            requested_reservation_time: form.requested_reservation_time,
            notes: form.notes,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update reservation.");
      }

      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    }
  }

  async function cancelReservation() {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this reservation?"
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/customer/reservations/${form.entry_id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reservation_code: form.reservation_code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to cancel reservation.");
      }

      setMessage(data.message);
      setMode("create");
      setQueueInfo(null);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div
      className="customer-page"
      style={{ backgroundImage: `url(${sunsetCafeBg})` }}
    >
      <div className="customer-overlay"></div>
      <div className="customer-content">
        <div className="customer-topbar">
          <div className="customer-brand-mark">
            <i className="bi bi-brightness-high"></i>
          </div>
          <h1>Sunset Cafe</h1>
          <p>GOOD FOOD. GOOD COFFEE. GOOD TIMES.</p>
        </div>

        <div className="customer-card shadow-lg">
          <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
            <div>
              <h2>Make a Reservation</h2>
              <p className="customer-subtitle mb-0">
                Reserve instantly or look up an existing booking.
              </p>
            </div>
            <button
              className="btn customer-ghost-btn"
              onClick={goToEmployeeLogin}
            >
              Employee Login
            </button>
          </div>

          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-danger">{error}</div>}

          {queueInfo && (
            <section className="customer-queue-card">
              <div className="customer-queue-header">
                <h3>
                  Hi {queueInfo.customerName || "Guest"}!
                </h3>
                <p>
                  Thank you for choosing Sunset Tea. You will be notified when
                  your table is ready.
                </p>
              </div>

              <div className="customer-queue-stats">
                <div>
                  <p className="customer-queue-label">Position in Queue</p>
                  <div className="customer-queue-value customer-queue-position">
                    {queueInfo.queuePosition || "-"}
                  </div>
                </div>
                <div>
                  <p className="customer-queue-label">Estimated Wait Time</p>
                  <div className="customer-queue-value">
                    {queueInfo.estimatedWait}
                  </div>
                </div>
              </div>

              <div className="customer-queue-actions">
                <button
                  type="button"
                  className="btn customer-outline-btn-danger"
                  onClick={cancelReservation}
                >
                  Leave Wait List
                </button>
                <button
                  type="button"
                  className="btn customer-outline-btn"
                  onClick={() => setMode("edit")}
                >
                  Edit Waitlist
                </button>
              </div>
            </section>
          )}

          <div className="mb-4 customer-mode-switch">
            <button
              className={`btn ${
                mode === "create" ? "customer-main-btn" : "customer-outline-btn"
              }`}
              onClick={() => {
                setMode("create");
                setQueueInfo(null);
              }}
            >
              New Reservation
            </button>

            <button
              className={`btn ${
                mode === "lookup" || mode === "edit"
                  ? "customer-main-btn"
                  : "customer-outline-btn"
              }`}
              onClick={() => {
                setMode("lookup");
                setQueueInfo(null);
              }}
            >
              Edit/Cancel
            </button>
          </div>

          {mode === "lookup" && (
            <form onSubmit={findReservation}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Reservation ID</label>
                  <input
                    className="form-control customer-input"
                    value={lookup.entry_id}
                    onChange={(e) => updateLookup("entry_id", e.target.value)}
                    required
                  />
                  {fieldErrors.entry_id && (
                    <div className="text-danger mt-1">{fieldErrors.entry_id}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Reservation Code</label>
                  <input
                    className="form-control customer-input"
                    value={lookup.reservation_code}
                    onChange={(e) =>
                      updateLookup("reservation_code", e.target.value.toUpperCase())
                    }
                    required
                  />
                  {fieldErrors.reservation_code && (
                    <div className="text-danger mt-1">
                      {fieldErrors.reservation_code}
                    </div>
                  )}
                </div>

                <div className="col-12">
                  <button className="btn customer-main-btn">Find Reservation</button>
                </div>
              </div>
            </form>
          )}

          {(mode === "create" || mode === "edit") && (
            <form onSubmit={mode === "create" ? createReservation : updateReservation}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">First Name</label>
                  <input
                    className="form-control customer-input"
                    value={form.first_name}
                    onChange={(e) => updateForm("first_name", e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Last Name</label>
                  <input
                    className="form-control customer-input"
                    value={form.last_name}
                    onChange={(e) => updateForm("last_name", e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Phone Number</label>
                  <input
                    className="form-control customer-input"
                    value={form.phone_number}
                    onChange={(e) => updateForm("phone_number", e.target.value)}
                    required
                  />
                  {fieldErrors.phone_number && (
                    <div className="text-danger mt-1">
                      {fieldErrors.phone_number}
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control customer-input"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Preferred Contact</label>
                  <select
                    className="form-select customer-input"
                    value={form.preferred_contact_method}
                    onChange={(e) =>
                      updateForm("preferred_contact_method", e.target.value)
                    }
                  >
                    <option value="Email">Email</option>
                    <option value="Text">Text</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label">Party Size</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control customer-input"
                    value={form.party_size}
                    onChange={(e) => updateForm("party_size", e.target.value)}
                    required
                  />
                  {fieldErrors.party_size && (
                    <div className="text-danger mt-1">{fieldErrors.party_size}</div>
                  )}
                </div>

                <div className="col-md-4">
                  <label className="form-label">Reservation Time</label>
                  <input
                    type="datetime-local"
                    className="form-control customer-input"
                    value={form.requested_reservation_time}
                    onChange={(e) =>
                      updateForm("requested_reservation_time", e.target.value)
                    }
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control customer-input"
                    rows="3"
                    value={form.notes}
                    onChange={(e) => updateForm("notes", e.target.value)}
                  ></textarea>
                </div>

                <div className="col-12 d-flex gap-2 flex-wrap">
                  <button
                    className={`btn ${
                      mode === "create"
                        ? "customer-reserve-btn"
                        : "customer-main-btn"
                    }`}
                  >
                    {mode === "create" ? "Reserve Table" : "Save Changes"}
                  </button>

                  {mode === "edit" && (
                    <button
                      type="button"
                      className="btn customer-outline-btn-danger"
                      onClick={cancelReservation}
                    >
                      Cancel Reservation
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
