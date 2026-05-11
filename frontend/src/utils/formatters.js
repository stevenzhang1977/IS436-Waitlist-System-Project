/**
 * Converts a backend datetime value into the format required by
 * an HTML datetime-local input.
 *
 * Handles MySQL DATETIME strings like:
 * 2026-05-08 14:40:00
 */
export function formatDateTimeForInput(value) {
  if (!value) return "";

  const stringValue = String(value);

  // MySQL DATETIME format: YYYY-MM-DD HH:mm:ss
  if (stringValue.includes(" ")) {
    return stringValue.slice(0, 16).replace(" ", "T");
  }

  // Already in datetime-local format
  if (stringValue.includes("T")) {
    return stringValue.slice(0, 16);
  }

  return "";
}

/**
 * Formats backend datetime values for display without timezone shifting.
 *
 * Example:
 * 2026-05-08 14:40:00 -> May 8, 2:40 PM
 */
export function formatDateTimeForDisplay(value) {
  if (!value) return "—";

  const stringValue = String(value);

  let datePart = "";
  let timePart = "";

  if (stringValue.includes(" ")) {
    [datePart, timePart] = stringValue.split(" ");
  } else if (stringValue.includes("T")) {
    [datePart, timePart] = stringValue.split("T");
  } else {
    return stringValue;
  }

  const [year, month, day] = datePart.split("-");
  const [hourRaw, minute] = timePart.split(":");

  let hour = Number(hourRaw);
  const ampm = hour >= 12 ? "PM" : "AM";

  hour = hour % 12;
  if (hour === 0) hour = 12;

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return `${monthNames[Number(month) - 1]} ${Number(day)}, ${hour}:${minute} ${ampm}`;
}

/**
 * Returns Bootstrap badge colors based on waitlist status.
 */
export function getBadgeClass(status) {
  if (status === "Waiting") return "bg-warning text-dark";
  if (status === "Notified") return "bg-info text-dark";
  if (status === "Ready") return "bg-success";
  if (status === "Seated") return "bg-dark";
  if (status === "Cancelled") return "bg-danger";
  if (status === "No-Show") return "bg-secondary";
  return "bg-secondary";
}

/**
 * Returns Bootstrap badge colors based on email delivery status.
 */
export function getDeliveryStatusBadge(status) {
  if (status === "Sent") return "bg-success";
  if (status === "Pending") return "bg-warning text-dark";
  if (status === "Failed") return "bg-danger";
  if (status?.includes("Not Sent")) return "bg-secondary";
  return "bg-secondary";
}