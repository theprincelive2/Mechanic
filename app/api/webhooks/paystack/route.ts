import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, payments, customers, jobs, vehicles, messageLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPaystackSignature, verifyPaystackTransaction } from "@/lib/paystack";
import { sendWhatsAppText, messageTemplates } from "@/lib/whatsapp";

// Configure this URL in your Paystack dashboard under Settings -> API Keys & Webhooks:
// https://yourdomain.com/api/webhooks/paystack
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    const reference = event.data.reference as string;
    const verified = await verifyPaystackTransaction(reference);
    if (verified.status === "success") {
      const invoiceId = Number(verified.metadata?.invoiceId);
      if (invoiceId) {
        const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
        if (invoice) {
          const amount = verified.amount / 100;
          await db.insert(payments).values({ invoiceId, amount: amount.toFixed(2), method: "PAYSTACK", reference });

          const allPayments = await db.query.payments.findMany({ where: eq(payments.invoiceId, invoiceId) });
          const paid = allPayments.reduce((s, p) => s + Number(p.amount), 0);
          const status = paid >= Number(invoice.total) ? "PAID" : "PARTIAL";
          await db.update(invoices).set({ amountPaid: paid.toFixed(2), status: status as any }).where(eq(invoices.id, invoiceId));

          const [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId)).limit(1);
          const [job] = await db.select().from(jobs).where(eq(jobs.id, invoice.jobId)).limit(1);
          const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, job.vehicleId)).limit(1);
          const msg = messageTemplates.paymentReceived(customer.name, amount.toFixed(2), vehicle.plate);
          try {
            await sendWhatsAppText(customer.phone, msg);
            await db.insert(messageLogs).values({ customerId: customer.id, jobId: job.id, channel: "WHATSAPP", content: msg, status: "SENT" });
          } catch {}
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
