import { db } from "@/db";
import { jobs, vehicles, customers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { PageHeader, StatusStamp, PlateBadge } from "@/components/ui";
import { createJob } from "@/lib/actions";
import { JOB_STATUS_ORDER, JOB_STATUS_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JobsPage({ searchParams }: { searchParams: { vehicleId?: string } }) {
  const allJobs = await db
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
    .orderBy(desc(jobs.createdAt));

  const allVehicles = await db
    .select({ id: vehicles.id, plate: vehicles.plate, make: vehicles.make, model: vehicles.model, customerId: vehicles.customerId, customerName: customers.name })
    .from(vehicles)
    .leftJoin(customers, eq(vehicles.customerId, customers.id));

  const columns = JOB_STATUS_ORDER.map((status) => ({
    status,
    label: JOB_STATUS_LABELS[status],
    items: allJobs.filter((j) => j.status === status),
  }));

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle={`${allJobs.length} total work orders`}
      />

      <details className="ticket rounded-lg pl-6 pr-5 py-4 mb-8" open={!!searchParams.vehicleId}>
        <summary className="cursor-pointer font-medium text-sm text-amber">+ Create new job order</summary>
        <form action={createJob} className="grid grid-cols-2 gap-3 mt-4">
          <label className="col-span-2 block">
            <span className="block text-xs font-mono uppercase tracking-wide text-paper/50 mb-1">Vehicle</span>
            <select
              name="vehicleId"
              required
              defaultValue={searchParams.vehicleId || ""}
              onChange={undefined}
              className="w-full bg-graphite border border-graphite-line rounded px-3 py-2 text-sm outline-none focus:border-amber"
            >
              <option value="" disabled>
                Select a vehicle…
              </option>
              {allVehicles.map((v) => (
                <option key={v.id} value={v.id} data-customer={v.customerId}>
                  {v.plate} — {v.make} {v.model} ({v.customerName})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-mono uppercase tracking-wide text-paper/50 mb-1">Mileage in (km)</span>
            <input name="mileageIn" type="number" className="w-full bg-graphite border border-graphite-line rounded px-3 py-2 text-sm outline-none focus:border-amber" />
          </label>
          <label className="col-span-2 block">
            <span className="block text-xs font-mono uppercase tracking-wide text-paper/50 mb-1">Reported issue</span>
            <textarea name="reportedIssue" rows={2} required className="w-full bg-graphite border border-graphite-line rounded px-3 py-2 text-sm outline-none focus:border-amber" />
          </label>
          <button className="col-span-2 bg-amber text-graphite font-semibold rounded py-2 mt-1 hover:brightness-110">
            Open job order
          </button>
        </form>
      </details>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {columns.map((col) => (
          <div key={col.status}>
            <p className="text-xs font-mono uppercase tracking-wide text-paper/50 mb-2">
              {col.label} <span className="text-paper/30">({col.items.length})</span>
            </p>
            <div className="space-y-2">
              {col.items.map((j) => (
                <Link
                  key={j.id}
                  href={`/dashboard/jobs/${j.id}`}
                  className="ticket rounded-md pl-4 pr-3 py-2 block hover:border-amber/50 transition"
                >
                  <p className="text-[11px] font-mono text-paper/40">{j.jobNumber}</p>
                  {j.plate && <p className="text-xs font-mono mt-0.5">{j.plate}</p>}
                  <p className="text-xs text-paper/70 mt-1 line-clamp-2">{j.reportedIssue}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

