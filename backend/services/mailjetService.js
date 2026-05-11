const mailjet = require("node-mailjet");

/**
 * Check whether Mailjet is configured.
 * If not configured, the app still works but records notification as Not Sent.
 */
const hasMailjetConfig =
  process.env.MAILJET_API_KEY &&
  process.env.MAILJET_SECRET_KEY &&
  process.env.MAILJET_FROM_EMAIL;

/**
 * Create the Mailjet client only if the required environment variables exist.
 */
const mailjetClient = hasMailjetConfig
  ? mailjet.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_SECRET_KEY
    )
  : null;

/**
 * Sends a "table is ready" email to a customer.
 */
async function sendReadyEmail(reservation) {
  const fromName = process.env.MAILJET_FROM_NAME || "Sunset Tea";

  const notificationText = `Hi ${reservation.first_name}, your table is ready at Sunset Tea. Please check in with the host.`;

  /**
   * If Mailjet is not configured, do not crash the app.
   * Return a status that can be stored in the notification table.
   */
  if (!mailjetClient) {
    return {
      deliveryStatus: "Not Sent",
      messageId: null,
      notificationText,
    };
  }

  const mailjetResult = await mailjetClient
    .post("send", { version: "v3.1" })
    .request({
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_FROM_EMAIL,
            Name: fromName,
          },
          To: [
            {
              Email: reservation.email,
              Name: `${reservation.first_name} ${reservation.last_name}`,
            },
          ],
          Subject: "Your table is ready at Sunset Tea",
          TextPart: notificationText,
          HTMLPart: `
            <p>Hi ${reservation.first_name},</p>
            <p>Your table is ready at <strong>Sunset Tea</strong>.</p>
            <p>Please check in with the host when you arrive.</p>
            <p>Thank you!</p>
          `,
        },
      ],
    });

  /**
   * Mailjet returns a MessageID. We do not store it in delivery_status
   * because that database column may be too short.
   */
  const messageId =
    mailjetResult?.body?.Messages?.[0]?.To?.[0]?.MessageID || null;

  return {
    deliveryStatus: "Sent",
    messageId,
    notificationText,
  };
}

module.exports = {
  sendReadyEmail,
};