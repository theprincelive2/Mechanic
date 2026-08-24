import { db } from "@/db";
import { parts } from "@/db/schema";
import { desc } from "drizzle-orm";
import { PageHeader } from "@/components/ui";
import { addPart, adjustPartStock } from "@/lib/actions";
import { formatGHS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const rows = await db.select().from(parts).orderBy(desc(parts.createdAt));

  const increment = async (formData: FormData) => {
    "use server";
    await adjustPartStock(Number(formData.get("partId")), 1);
  };
  const decrement = async (formData: FormData) => {
    "use server";
    await adjustPartStock(Number(formData.get("partId")), -1);
  };

  return (
    <div>
      <PageHeader title="Inventory" subtitle={`${rows.length} parts tracked`} />

      <details className="ticket rounded-lg pl-6 pr-5 py-4 mb-8">
        <summary className="cursor-pointer font-medium text-sm text-amber">+ Add new part</summary>
        <form action={addPart} className="grid grid-cols-2 gap-3 mt-4">
          <input name="name" placeholder="Part name" required className="bg-graphite border border-graphite-line rounded px-3 py-2 text-sm" />
          <input name="sku" placeholder="SKU (optional)" className="bg-graphite border border-graphite-line rounded px-3 py-2 text-sm" />
          <input name="quantity" type="number" placeholder="Starting quantity" className="bg-graphite border border-graphite-line rounded px-3 py-2 text-sm" />
          <input name="lowStockThreshold" type="number" placeholder="Low stock threshold" className="bg-graphite border border-graphite-line rounded px-3 py-2 text-sm" />
          <input name="costPrice" placeholder="Cost price (GHS)" className="bg-graphite border border-graphite-line rounded px-3 py-2 text-sm" />
          <input name="sellPrice" placeholder="Sell price (GHS)" className="bg-graphite border border-graphite-line rounded px-3 py-2 text-sm" />
          <button className="col-span-2 bg-amber text-graphite font-semibold rounded py-2 mt-1">Save part</button>
        </form>
      </details>

      <div className="space-y-2">
        {rows.map((p) => {
          const low = p.quantity <= p.lowStockThreshold;
          return (
            <div key={p.id} className={`ticket rounded-lg pl-6 pr-5 py-3 flex items-center justify-between ${low ? "border-rust/50" : ""}`}>
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-paper/40 font-mono">{p.sku} · Cost {formatGHS(p.costPrice)} · Sell {formatGHS(p.sellPrice)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-mono text-sm ${low ? "text-rust" : "text-paper"}`}>{p.quantity} in stock</span>
                <form action={decrement}><input type="hidden" name="partId" value={p.id} /><button className="w-7 h-7 rounded bg-graphite-line text-sm">−</button></form>
                <form action={increment}><input type="hidden" name="partId" value={p.id} /><button className="w-7 h-7 rounded bg-graphite-line text-sm">+</button></form>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-paper/40 text-sm">No parts tracked yet.</p>}
      </div>
    </div>
  );
}
