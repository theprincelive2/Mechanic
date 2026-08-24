import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, messageLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

// Meta calls this with GET once to verify the webhook subscription.
// Configure in Meta App Dashboard -> WhatsApp -> Configuration -> Webhook.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// Logs inbound customer replies against their record so front desk can see them.
export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const entry = body.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];
    if (message) {
      const fromPhone = `+${message.from}`;
      const text = message.text?.body || `[${message.type}]`;
      const [customer] = await db.select().from(customers).where(eq(customers.phone, fromPhone)).limit(1);
      if (customer) {
        await db.insert(messageLogs).values({
          customerId: customer.id,
          channel: "WHATSAPP",
          content: `(Customer reply) ${text}`,
          status: "RECEIVED",
        });
      }
    }
  } catch (e) {
    console.error("WhatsApp webhook parse error", e);
  }
  return NextResponse.json({ received: true });
}
