import { db } from "@/db";
import { jobs, invoices, parts, customers, vehicles } from "@/db/schema";
import { eq, sql, desc, ne, gte } from "drizzle-orm";
import Link from "next/link";
import { PageHeader, StatCard, StatusStamp, PlateBadge } from "@/components/ui";
import { formatGHS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [[{ count: activeJobs }], [{ count: totalCustomers }], allInvoices, lowStockParts, recentJobs] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(jobs).where(ne(jobs.status, "COMPLETED")),
      db.select({ count: sql<number>`count(*)::int` }).from(customers),
      db.select().from(invoices),
      db.select().from(parts).where(sql`${parts.quantity} <= ${parts.lowStockThreshold}`),
      db
        .select({
          id: jobs.id,
          jobNumber: jobs.jobNumber,
          status: jobs.status,
          reportedIssue: jobs.reportedIssue,
          plate: vehicles.plate,
          customerName: customers.name,
        })
        .from(jobs)
        .leftJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
        .leftJoin(customers, eq(jobs.customerId, customers.id))
        .orderBy(desc(jobs.createdAt))
        .limit(6),
    ]);

  const outstanding = allInvoices.reduce((s, inv) => s + (Number(inv.total) - Number(inv.amountPaid)), 0);
  const revenueThisMonthPaid = allInvoices
    .filter((i) => i.status === "PAID" || i.status === "PARTIAL")
    .reduce((s, i) => s + Number(i.amountPaid), 0);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Welcome back — here's what's happening at the shop." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Jobs" value={activeJobs} />
        <StatCard label="Customers" value={totalCustomers} />
        <StatCard label="Outstanding" value={formatGHS(outstanding)} sub="Unpaid invoice balance" />
        <StatCard label="Collected" value={formatGHS(revenueThisMonthPaid)} sub="All time payments received" />
      </div>

      {lowStockParts.length > 0 && (
        <div className="ticket rounded-lg pl-6 pr-5 py-4 mb-8 border-rust/40">
          <p className="text-xs font-mono uppercase tracking-wide text-rust mb-2">Low stock alert</p>
          <ul className="space-y-1 text-sm">
            {lowStockParts.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="text-rust font-mono">{p.quantity} left</span>
              </li>
            ))}
          </ul>
          <Link href="/dashboard/inventory" className="text-xs text-amber hover:underline mt-2 inline-block">
            Manage inventory →
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-lg">Recent jobs</h2>
        <Link href="/dashboard/jobs" className="text-sm text-amber hover:underline">
          View all →
        </Link>
      </div>
      <div className="space-y-3">
        {recentJobs.map((j) => (
          <Link
            key={j.id}
            href={`/dashboard/jobs/${j.id}`}
            className="ticket rounded-lg pl-6 pr-5 py-3 flex items-center justify-between hover:border-amber/50 transition"
          >
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-paper/40">{j.jobNumber}</span>
              {j.plate && <PlateBadge plate={j.plate} />}
              <div>
                <p className="text-sm font-medium">{j.customerName}</p>
                <p className="text-xs text-paper/50 truncate max-w-xs">{j.reportedIssue}</p>
              </div>
            </div>
            <StatusStamp status={j.status} />
          </Link>
        ))}
        {recentJobs.length === 0 && <p className="text-paper/40 text-sm">No jobs yet. Create your first job order.</p>}
      </div>
    </div>
  );
}
