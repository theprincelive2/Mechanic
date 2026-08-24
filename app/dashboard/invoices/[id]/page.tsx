import { db } from "@/db";
import { invoices, invoiceItems, customers, jobs, vehicles, payments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader, StatusStamp } from "@/components/ui";
import { addInvoiceItem, removeInvoiceItem, sendInvoiceToCustomer, recordManualPayment } from "@/lib/actions";
import { formatGHS } from "@/lib/utils";
import PaystackButton from "@/components/PaystackButton";
import PrintButton from "@/components/PrintButton";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoiceId = Number(params.id);
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoice) notFound();

  const [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId)).limit(1);
  const [job] = await db.select().from(jobs).where(eq(jobs.id, invoice.jobId)).limit(1);
  const [vehicle] = job ? await db.select().from(vehicles).where(eq(vehicles.id, job.vehicleId)).limit(1) : [null];
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  const invoicePayments = await db.select().from(payments).where(eq(payments.invoiceId, invoiceId)).orderBy(desc(payments.createdAt));

  const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
  const vat = subtotal * (Number(invoice.vatRate) / 100);
  const levy = subtotal * (Number(invoice.levyRate) / 100);
  // Computed live from line items so the total is always accurate, even if
  // items were inserted directly (e.g. by a seed script or migration).
  const total = subtotal + vat + levy;
  const balance = total - Number(invoice.amountPaid);

  const addItem = async (formData: FormData) => {
    "use server";
    await addInvoiceItem(invoiceId, formData);
  };
  const removeItem = async (formData: FormData) => {
    "use server";
    await removeInvoiceItem(invoiceId, Number(formData.get("itemId")));
  };
  const sendInvoice = async () => {
    "use server";
    await sendInvoiceToCustomer(invoiceId);
  };
  const recordPayment = async (formData: FormData) => {
    "use server";
    await recordManualPayment(invoiceId, formData);
  };

  return (
    <div>
      <PageHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        subtitle={`${customer?.name} · ${vehicle ? `${vehicle.plate} — ${vehicle.year} ${vehicle.make} ${vehicle.model}` : ""}`}
        action={<StatusStamp status={invoice.status} />}
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="ticket rounded-lg pl-6 pr-5 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-mono uppercase text-paper/40 border-b border-graphite-line">
                  <th className="pb-2">Description</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Unit</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2 no-print"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-graphite-line/40">
                    <td className="py-2">{it.description}</td>
                    <td className="py-2 text-paper/50">{it.type}</td>
                    <td className="py-2 text-right font-mono">{it.quantity}</td>
                    <td className="py-2 text-right font-mono">{formatGHS(it.unitPrice)}</td>
                    <td className="py-2 text-right font-mono">{formatGHS(Number(it.quantity) * Number(it.unitPrice))}</td>
                    <td className="py-2 text-right no-print">
                      <form action={removeItem}>
                        <input type="hidden" name="itemId" value={it.id} />
                        <button className="text-rust text-xs">✕</button>
                      </form>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-paper/40">No line items yet.</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex justify-end mt-4">
              <div className="w-56 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-paper/50">Subtotal</span><span className="font-mono">{formatGHS(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-paper/50">VAT ({invoice.vatRate}%)</span><span className="font-mono">{formatGHS(vat)}</span></div>
                <div className="flex justify-between"><span className="text-paper/50">NHIL/GETFund ({invoice.levyRate}%)</span><span className="font-mono">{formatGHS(levy)}</span></div>
                <div className="flex justify-between font-bold border-t border-graphite-line pt-1 mt-1"><span>Total</span><span className="font-mono">{formatGHS(total)}</span></div>
                <div className="flex justify-between text-teal"><span>Paid</span><span className="font-mono">{formatGHS(invoice.amountPaid)}</span></div>
                <div className="flex justify-between text-rust font-semibold"><span>Balance</span><span className="font-mono">{formatGHS(balance)}</span></div>
              </div>
            </div>

            <form action={addItem} className="flex gap-2 mt-4 no-print">
              <select name="type" className="bg-graphite border border-graphite-line rounded px-2 py-1.5 text-sm">
                <option value="PART">Part</option>
                <option value="LABOR">Labor</option>
                <option value="FEE">Fee</option>
              </select>
              <input name="description" placeholder="Description" required className="flex-1 bg-graphite border border-graphite-line rounded px-2 py-1.5 text-sm outline-none focus:border-amber" />
              <input name="quantity" placeholder="Qty" defaultValue="1" className="w-16 bg-graphite border border-graphite-line rounded px-2 py-1.5 text-sm" />
              <input name="unitPrice" placeholder="Unit price" required className="w-28 bg-graphite border border-graphite-line rounded px-2 py-1.5 text-sm" />
              <button className="bg-amber text-graphite text-sm font-semibold rounded px-3">Add</button>
            </form>
          </div>

          <div className="ticket rounded-lg pl-6 pr-5 py-4 no-print">
            <p className="text-xs font-mono uppercase tracking-wide text-paper/50 mb-3">Record a manual payment</p>
            <form action={recordPayment} className="flex gap-2">
              <input name="amount" placeholder="Amount (GHS)" required className="flex-1 bg-graphite border border-graphite-line rounded px-2 py-1.5 text-sm" />
              <select name="method" className="bg-graphite border border-graphite-line rounded px-2 py-1.5 text-sm">
                <option value="CASH">Cash</option>
                <option value="MOMO">Mobile Money</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
              <input name="reference" placeholder="Reference (optional)" className="flex-1 bg-graphite border border-graphite-line rounded px-2 py-1.5 text-sm" />
              <button className="bg-teal text-graphite text-sm font-semibold rounded px-3">Record</button>
            </form>

            <div className="mt-4 space-y-1">
              {invoicePayments.map((p) => (
                <div key={p.id} className="flex justify-between text-xs text-paper/60">
                  <span>{p.method} {p.reference ? `· ${p.reference}` : ""}</span>
                  <span className="font-mono">{formatGHS(p.amount)}</span>
                  <span className="text-paper/30">{format(new Date(p.createdAt), "d MMM yyyy, HH:mm")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 no-print">
          <form action={sendInvoice}>
            <button className="w-full bg-amber text-graphite text-sm font-semibold rounded py-2">
              Send invoice via WhatsApp
            </button>
          </form>
          {balance > 0 && <PaystackButton invoiceId={invoiceId} />}
          <PrintButton />
        </div>
      </div>
    </div>
  );
}
