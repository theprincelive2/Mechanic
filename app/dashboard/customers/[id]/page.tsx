import { db } from "@/db";
import { customers, vehicles, jobs, messageLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, StatusStamp, PlateBadge } from "@/components/ui";
import { addVehicle, sendCustomMessage } from "@/lib/actions";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customerId = Number(params.id);
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!customer) notFound();

  const customerVehicles = await db.select().from(vehicles).where(eq(vehicles.customerId, customerId));
  const vehicleIds = customerVehicles.map((v) => v.id);

  const allJobs = vehicleIds.length
    ? await db.select().from(jobs).where(eq(jobs.customerId, customerId)).orderBy(desc(jobs.createdAt))
    : [];

  const messages = await db
    .select()
    .from(messageLogs)
    .where(eq(messageLogs.customerId, customerId))
    .orderBy(desc(messageLogs.createdAt))
    .limit(15);

  const sendMessage = async (formData: FormData) => {
    "use server";
    const content = String(formData.get("content") || "");
    if (content.trim()) await sendCustomMessage(customerId, null, content);
  };

  const addVehicleAction = async (formData: FormData) => {
    "use server";
    await addVehicle(customerId, formData);
  };

  return (
    <div>
      <PageHeader
        title={customer.name}
        subtitle={`${customer.phone}${customer.email ? " · " + customer.email : ""}`}
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-lg">Vehicles</h2>
            </div>
            <div className="space-y-3">
              {customerVehicles.map((v) => (
                <div key={v.id} className="ticket rounded-lg pl-6 pr-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PlateBadge plate={v.plate} />
                    <div>
                      <p className="text-sm font-medium">
                        {v.year} {v.make} {v.model}
                      </p>
                      <p className="text-xs text-paper/40 font-mono">
                        {v.color} · {v.mileage?.toLocaleString()} km · VIN {v.vin || "—"}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/jobs?vehicleId=${v.id}`}
                    className="text-xs text-amber hover:underline"
                  >
                    New job →
                  </Link>
                </div>
              ))}
              {customerVehicles.length === 0 && <p className="text-paper/40 text-sm">No vehicles on file.</p>}
            </div>

            <details className="ticket rounded-lg pl-6 pr-5 py-3 mt-3">
              <summary className="cursor-pointer text-xs text-amber font-medium">+ Add another vehicle</summary>
              <form action={addVehicleAction} className="grid grid-cols-2 gap-3 mt-3">
                <MakeSelect />
                {["model", "year", "plate", "vin", "color", "mileage"].map((f) => (
                  <input
                    key={f}
                    name={f}
                    placeholder={f[0].toUpperCase() + f.slice(1)}
                    className="bg-graphite border border-graphite-line rounded px-3 py-2 text-sm outline-none focus:border-amber"
                  />
                ))}
                <button className="col-span-2 bg-amber text-graphite text-sm font-semibold rounded py-2 mt-1">
                  Save vehicle
                </button>
              </form>
            </details>
          </div>

          <div>
            <h2 className="font-display font-bold text-lg mb-3">Service history</h2>
            <div className="space-y-2">
              {allJobs.map((j) => {
                const vehicle = customerVehicles.find((v) => v.id === j.vehicleId);
                return (
                  <Link
                    key={j.id}
                    href={`/dashboard/jobs/${j.id}`}
                    className="ticket rounded-lg pl-6 pr-5 py-3 flex items-center justify-between hover:border-amber/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-paper/40">{j.jobNumber}</span>
                      {vehicle && <PlateBadge plate={vehicle.plate} />}
                      <p className="text-sm truncate max-w-xs">{j.reportedIssue}</p>
                    </div>
                    <StatusStamp status={j.status} />
                  </Link>
                );
              })}
              {allJobs.length === 0 && <p className="text-paper/40 text-sm">No service history yet.</p>}
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-display font-bold text-lg mb-3">WhatsApp updates</h2>
          <form action={sendMessage} className="ticket rounded-lg pl-6 pr-5 py-3 mb-3 space-y-2">
            <textarea
              name="content"
              rows={3}
              placeholder="Send a message to this customer…"
              className="w-full bg-graphite border border-graphite-line rounded px-3 py-2 text-sm outline-none focus:border-amber resize-none"
            />
            <button className="w-full bg-teal text-graphite text-sm font-semibold rounded py-2">Send</button>
          </form>
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {messages.map((m) => (
              <div key={m.id} className="bg-graphite-panel border border-graphite-line rounded-lg px-3 py-2 text-xs">
                <p className="text-paper/90">{m.content}</p>
                <p className="text-paper/30 mt-1 font-mono">
                  {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })} · {m.status}
                </p>
              </div>
            ))}
            {messages.length === 0 && <p className="text-paper/40 text-sm">No messages sent yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

const CAR_MAKES = [
  "Toyota", "Nissan", "Honda", "Suzuki", "Mitsubishi", "Mazda", "Subaru",
  "Hyundai", "Isuzu", "Kia", "KGM", "Genesis",
  "Volkswagen", "Peugeot", "Renault", "Fiat",
  "Ford", "Chevrolet", "Jeep", "Tesla",
  "Mercedes-Benz", "BMW", "Audi", "Lexus",
  "Land Rover", "Jaguar", "Porsche", "Volvo",
  "Bentley", "Rolls-Royce", "Ferrari", "Lamborghini",
  "Jetour", "BYD", "Maserati", "Aston Martin", "McLaren",
];

function MakeSelect() {
  return (
    <div className="col-span-2 grid grid-cols-2 gap-3">
      <label className="block">
        <span className="block text-xs font-mono uppercase tracking-wide text-paper/50 mb-1">Make</span>
        <select
          name="make"
          defaultValue=""
          className="w-full bg-graphite border border-graphite-line rounded px-3 py-2 text-sm outline-none focus:border-amber appearance-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
        >
          <option value="" disabled>Select make…</option>
          {CAR_MAKES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
          <option value="Other">Other</option>
        </select>
      </label>
      <label className="block">
        <span className="block text-xs font-mono uppercase tracking-wide text-paper/50 mb-1">Other make (if not listed)</span>
        <input
          name="make_other"
          type="text"
          placeholder="Type make here…"
          className="w-full bg-graphite border border-graphite-line rounded px-3 py-2 text-sm outline-none focus:border-amber"
        />
      </label>
    </div>
  );
}
