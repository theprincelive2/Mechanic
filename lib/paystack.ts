const PAYSTACK_BASE = "https://api.paystack.co";

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set in environment variables.");
  return key;
}

/**
 * Initializes a Paystack transaction so the customer can pay an invoice via
 * card, MoMo (MTN/Vodafone/AirtelTigo), or bank. Returns an authorization_url
 * to send the customer (e.g. inside the WhatsApp invoice message).
 */
export async function initializePaystackTransaction(params: {
  email: string;
  amountInPesewas: number; // Paystack expects the smallest currency unit
  reference: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
}) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountInPesewas,
      currency: "GHS",
      reference: params.reference,
      metadata: params.metadata,
      callback_url: params.callbackUrl,
      channels: ["card", "mobile_money", "bank_transfer"],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to initialize Paystack transaction");
  return data.data as { authorization_url: string; access_code: string; reference: string };
}

/** Verifies a transaction after Paystack redirects back / sends a webhook. */
export async function verifyPaystackTransaction(reference: string) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to verify Paystack transaction");
  return data.data as { status: string; amount: number; reference: string; metadata: any };
}

/** Verifies the X-Paystack-Signature header on incoming webhooks. */
export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const crypto = require("crypto");
  const hash = crypto.createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  return hash === signature;
}
