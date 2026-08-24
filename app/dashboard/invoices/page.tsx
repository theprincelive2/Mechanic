import { db } from "@/db";
import { invoices, customers, vehicles, jobs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { PageHeader, StatusStamp } from "@/components/ui";
import { formatGHS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      customerName: customers.name,
      plate: vehicles.plate,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(jobs, eq(invoices.jobId, jobs.id))
    .leftJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
    .orderBy(desc(invoices.createdAt));

  return (
    <div>
      <PageHeader title="Invoices" subtitle={`${rows.length} invoices`} />
      <div className="space-y-2">
        {rows.map((inv) => (
          <Link
            key={inv.id}
            href={`/dashboard/invoices/${inv.id}`}
            className="ticket rounded-lg pl-6 pr-5 py-3 flex items-center justify-between hover:border-amber/50 transition"
          >
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-paper/40">{inv.invoiceNumber}</span>
              <div>
                <p className="text-sm font-medium">{inv.customerName}</p>
                <p className="text-xs text-paper/40 font-mono">{inv.plate}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm">{formatGHS(inv.total)}</p>
                <p className="text-xs text-paper/40">Paid {formatGHS(inv.amountPaid)}</p>
              </div>
              <StatusStamp status={inv.status} />
            </div>
          </Link>
        ))}
        {rows.length === 0 && <p className="text-paper/40 text-sm">No invoices yet — create one from a job.</p>}
      </div>
    </div>
  );
}
