import { db } from "@/db";
import { customers, vehicles } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { createCustomer } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      vehicleCount: sql<number>`count(${vehicles.id})::int`,
    })
    .from(customers)
    .leftJoin(vehicles, eq(vehicles.customerId, customers.id))
    .groupBy(customers.id)
    .orderBy(desc(customers.createdAt));

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${rows.length} customers on record`} />

      <details className="ticket rounded-lg pl-6 pr-5 py-4 mb-8 group">
        <summary className="cursor-pointer font-medium text-sm text-amber">+ Add new customer &amp; vehicle</summary>
        <form action={createCustomer} className="grid grid-cols-2 gap-3 mt-4">
          <Input name="name" label="Full name" required />
          <Input name="phone" label="Phone (WhatsApp)" placeholder="+233241234567" required />
          <Input name="email" label="Email (optional)" />
          <Input name="address" label="Address (optional)" />
          <div className="col-span-2 border-t border-graphite-line pt-3 mt-1">
            <p className="text-xs font-mono uppercase text-paper/40 mb-2">First vehicle (optional)</p>
          </div>
          <Input name="make" label="Make" placeholder="Toyota" />
          <Input name="model" label="Model" placeholder="Camry" />
          <Input name="year" label="Year" type="number" />
          <Input name="plate" label="Plate number" placeholder="GR 1234-20" />
          <Input name="vin" label="VIN (optional)" />
          <Input name="mileage" label="Mileage" type="number" />
          <button className="col-span-2 bg-amber text-graphite font-semibold rounded py-2 mt-2 hover:brightness-110">
            Save customer
          </button>
        </form>
      </details>

      <div className="space-y-2">
        {rows.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/customers/${c.id}`}
            className="ticket rounded-lg pl-6 pr-5 py-3 flex items-center justify-between hover:border-amber/50 transition"
          >
            <div>
              <p className="font-medium text-sm">{c.name}</p>
              <p className="text-xs text-paper/50 font-mono">{c.phone}</p>
            </div>
            <span className="text-xs text-paper/50">{c.vehicleCount} vehicle{c.vehicleCount === 1 ? "" : "s"}</span>
          </Link>
        ))}
        {rows.length === 0 && <p className="text-paper/40 text-sm">No customers yet.</p>}
      </div>
    </div>
  );
}

function Input({ name, label, required, type = "text", placeholder }: { name: string; label: string; required?: boolean; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-mono uppercase tracking-wide text-paper/50 mb-1">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full bg-graphite border border-graphite-line rounded px-3 py-2 text-sm outline-none focus:border-amber"
      />
    </label>
  );
}
