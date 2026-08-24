import { db } from "@/db";
import { payments, invoices, customers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { formatGHS } from "@/lib/utils";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const rows = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      method: payments.method,
      reference: payments.reference,
      createdAt: payments.createdAt,
      invoiceId: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      customerName: customers.name,
    })
    .from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .orderBy(desc(payments.createdAt));

  const total = rows.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <PageHeader title="Payments" subtitle={`${rows.length} payments recorded · ${formatGHS(total)} total`} />
      <div className="space-y-2">
        {rows.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/invoices/${p.invoiceId}`}
            className="ticket rounded-lg pl-6 pr-5 py-3 flex items-center justify-between hover:border-amber/50 transition"
          >
            <div>
              <p className="text-sm font-medium">{p.customerName}</p>
              <p className="text-xs text-paper/40 font-mono">{p.invoiceNumber} · {p.method} {p.reference ? `· ${p.reference}` : ""}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm">{formatGHS(p.amount)}</p>
              <p className="text-xs text-paper/30">{format(new Date(p.createdAt), "d MMM yyyy, HH:mm")}</p>
            </div>
          </Link>
        ))}
        {rows.length === 0 && <p className="text-paper/40 text-sm">No payments recorded yet.</p>}
      </div>
    </div>
  );
}
