/**
 * Thin wrapper around Meta's WhatsApp Cloud API.
 * Setup: create a Meta developer app -> add WhatsApp product -> get a
 * permanent access token + phone number ID -> set WHATSAPP_ACCESS_TOKEN
 * and WHATSAPP_PHONE_NUMBER_ID in your environment.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

function graphUrl() {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneId) throw new Error("WHATSAPP_PHONE_NUMBER_ID is not set");
  return `https://graph.facebook.com/v20.0/${phoneId}/messages`;
}

function normalizePhone(phone: string) {
  // Expects Ghana numbers like +2332xxxxxxxx; strips spaces/dashes.
  return phone.replace(/[^\d+]/g, "");
}

/** Sends a free-form text message. Only works within a 24h customer-initiated window. */
export async function sendWhatsAppText(toPhone: string, body: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    console.warn("WHATSAPP_ACCESS_TOKEN not set — message not sent, logging only:", body);
    return { simulated: true };
  }
  const res = await fetch(graphUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizePhone(toPhone),
      type: "text",
      text: { body },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to send WhatsApp message");
  return data;
}

/**
 * Sends a pre-approved template message. Use this for the first contact or
 * outside the 24h window (Meta requires approved templates in that case).
 * Create templates in Meta Business Manager first, then reference the name here.
 */
export async function sendWhatsAppTemplate(
  toPhone: string,
  templateName: string,
  languageCode = "en",
  components: any[] = []
) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    console.warn("WHATSAPP_ACCESS_TOKEN not set — template not sent, logging only:", templateName);
    return { simulated: true };
  }
  const res = await fetch(graphUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizePhone(toPhone),
      type: "template",
      template: { name: templateName, language: { code: languageCode }, components },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to send WhatsApp template");
  return data;
}

// Ready-made message copy for common shop events.
export const messageTemplates = {
  jobStatusUpdate: (customerName: string, plate: string, status: string) =>
    `Hi ${customerName}, update on your vehicle (${plate}): ${status}. Reply to this chat if you have any questions.`,
  quoteReady: (customerName: string, plate: string, total: string, link: string) =>
    `Hi ${customerName}, your quote for ${plate} is ready: GHS ${total}. Approve & pay here: ${link}`,
  vehicleReady: (customerName: string, plate: string) =>
    `Hi ${customerName}, your vehicle (${plate}) is ready for pickup. Thank you for choosing us!`,
  paymentReceived: (customerName: string, amount: string, plate: string) =>
    `Hi ${customerName}, we've received your payment of GHS ${amount} for ${plate}. Thank you!`,
  serviceReminder: (customerName: string, plate: string) =>
    `Hi ${customerName}, your vehicle (${plate}) is due for its next service. Reply to book an appointment.`,
};
