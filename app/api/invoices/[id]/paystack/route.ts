import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { initializePaystackTransaction } from "@/lib/paystack";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoiceId = Number(params.id);
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId)).limit(1);
  const balance = Number(invoice.total) - Number(invoice.amountPaid);
  if (balance <= 0) return NextResponse.json({ error: "Invoice already settled" }, { status: 400 });

  const reference = `${invoice.invoiceNumber}-${Date.now()}`;
  try {
    const data = await initializePaystackTransaction({
      email: customer.email || "customer@eastlegonauto.com",
      amountInPesewas: Math.round(balance * 100),
      reference,
      metadata: { invoiceId: invoice.id, customerId: customer.id },
      callbackUrl: `${process.env.NEXTAUTH_URL}/dashboard/invoices/${invoice.id}`,
    });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
