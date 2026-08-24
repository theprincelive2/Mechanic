import { db } from "@/db";
import { jobs, vehicles, customers, users, inspectionItems, invoices, messageLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, StatusStamp, PlateBadge } from "@/components/ui";
import { updateJobStatus, assignTechnician, addInspectionItem, createInvoiceForJob } from "@/lib/actions";
import { JOB_STATUS_ORDER, JOB_STATUS_LABELS, formatGHS } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

const CONDITION_COLOR: Record<string, string> = {
  GOOD: "text-teal",
  WARNING: "text-amber",
  URGENT: "text-rust",
};

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const jobId = Number(params.id);
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) notFound();

  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, job.vehicleId)).limit(1);
  const [customer] = await db.select().from(customers).where(eq(customers.id, job.customerId)).limit(1);
  const technicians = await db.select().from(users).where(eq(users.role, "TECHNICIAN"));
  const items = await db.select().from(inspectionItems).where(eq(inspectionItems.jobId, jobId));
  const jobInvoices = await db.select().from(invoices).where(eq(invoices.jobId, jobId));
  const messages = await db
    .select()
    .from(messageLogs)
    .where(eq(messageLogs.jobId, jobId))
    .orderBy(desc(messageLogs.createdAt));

  const setStatus = async (formData: FormData) => {
    "use server";
    await updateJobStatus(jobId, String(formData.get("status")));
  };
  const setTech = async (formData: FormData) => {
    "use server";
    await assignTechnician(jobId, Number(formData.get("userId")));
  };
  const addInspection = async (formData: FormData) => {
    "use server";
    await addInspectionItem(jobId, formData);
  };
  const makeInvoice = async () => {
    "use server";
    await createInvoiceForJob(jobId);
  };

  return (
    <div>
      <PageHeader
        title={`Job ${job.jobNumber}`}
        subtitle={vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : ""}
        action={<StatusStamp status={job.status} />}
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="ticket rounded-lg pl-6 pr-5 py-4">
            <div className="flex items-center gap-3 mb-3">
              {vehicle && <PlateBadge plate={vehicle.plate} />}
              <Link href={`/dashboard/customers/${job.customerId}`} className="text-sm text-amber hover:underline">
                {customer?.name}
              </Link>
              <span className="text-xs text-paper/40">{customer?.phone}</span>
            </div>
            <p className="text-sm text-paper/80">{job.reportedIssue}</p>
            <p className="text-xs text-paper/40 mt-2 font-mono">
              Mileage in: {job.mileageIn?.toLocaleString() || "—"} km
            </p>
          </div>

          <div className="ticket rounded-lg pl-6 pr-5 py-4">
            <p className="text-xs font-mono uppercase tracking-wide text-paper/50 mb-3">Update status</p>
            <form action={setStatus} className="flex flex-wrap gap-2">
              {JOB_STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  name="status"
                  value={s}
                  className={`text-xs px-3 py-1.5 rounded border ${
                    job.status === s
                      ? "bg-amber text-graphite border-amber"
                      : "border-graphite-line text-paper/60 hover:border-amber/50"
                  }`}
                >
                  {JOB_STATUS_LABELS[s]}
                </button>
              ))}
            </form>
            <p className="text-[11px] text-paper/30 mt-2">Changing status auto-sends a WhatsApp update to the customer.</p>
          </div>

          <div className="ticket rounded-lg pl-6 pr-5 py-4">
            <p className="text-xs font-mono uppercase tracking-wide text-paper/50 mb-3">Digital inspection</p>
            <div className="space-y-2 mb-3">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between text-sm border-b border-graphite-line/60 pb-2">
                  <div>
                    <p>{it.item}</p>
                    {it.note && <p className="text-xs text-paper/40">{it.note}</p>}
                  </div>
                  <span className={`text-xs font-mono uppercase ${CONDITION_COLOR[it.condition]}`}>{it.condition}</span>
                </div>
              ))}
              {items.length === 0 && <p className="text-paper/40 text-sm">No inspection items recorded yet.</p>}
            </div>
            <form action={addInspection} className="flex gap-2">
              <input name="item" placeholder="e.g. Brake pads" required className="flex-1 bg-graphite border border-graphite-line rounded px-2 py-1.5 text-sm outline-none focus:border-amber" />
              <select name="condition" className="bg-graphite border border-graphite-line rounded px-2 py-1.5 text-sm">
                <option value="GOOD">Good</option>
                <option value="WARNING">Warning</option>
                <option value="URGENT">Urgent</option>
              </select>
              <input name="note" placeholder="Note (optional)" className="flex-1 bg-graphite border border-graphite-line rounded px-2 py-1.5 text-sm outline-none focus:border-amber" />
              <button className="bg-teal text-graphite text-sm font-semibold rounded px-3">Add</button>
            </form>
          </div>

          <div className="ticket rounded-lg pl-6 pr-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-mono uppercase tracking-wide text-paper/50">Invoices</p>
              {jobInvoices.length === 0 && (
                <form action={makeInvoice}>
                  <button className="text-xs bg-amber text-graphite font-semibold rounded px-3 py-1.5">
                    + Create invoice
                  </button>
                </form>
              )}
            </div>
            <div className="space-y-2">
              {jobInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/dashboard/invoices/${inv.id}`}
                  className="flex items-center justify-between text-sm bg-graphite rounded px-3 py-2 hover:bg-graphite-line/40"
                >
                  <span className="font-mono">{inv.invoiceNumber}</span>
                  <span>{formatGHS(inv.total)}</span>
                  <StatusStamp status={inv.status} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="ticket rounded-lg pl-6 pr-5 py-4">
            <p className="text-xs font-mono uppercase tracking-wide text-paper/50 mb-2">Assigned technician</p>
            <form action={setTech} className="flex gap-2">
              <select name="userId" defaultValue={job.assignedToId || ""} className="flex-1 bg-graphite border border-graphite-line rounded px-2 py-1.5 text-sm">
                <option value="" disabled>Select…</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button className="text-xs bg-graphite-line rounded px-3">Set</button>
            </form>
          </div>

          <div>
            <p className="text-xs font-mono uppercase tracking-wide text-paper/50 mb-2">Update log</p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {messages.map((m) => (
                <div key={m.id} className="bg-graphite-panel border border-graphite-line rounded-lg px-3 py-2 text-xs">
                  <p className="text-paper/90">{m.content}</p>
                  <p className="text-paper/30 mt-1 font-mono">
                    {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })} · {m.status}
                  </p>
                </div>
              ))}
              {messages.length === 0 && <p className="text-paper/40 text-sm">No messages sent for this job.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
