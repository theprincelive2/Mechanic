export function formatGHS(amount: number | string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n || 0);
}

export function calcInvoiceTotals(
  items: { quantity: string | number; unitPrice: string | number }[],
  vatRate: number = 15,
  levyRate: number = 6
) {
  const subtotal = items.reduce((sum, it) => {
    const qty = typeof it.quantity === "string" ? parseFloat(it.quantity) : it.quantity;
    const price = typeof it.unitPrice === "string" ? parseFloat(it.unitPrice) : it.unitPrice;
    return sum + qty * price;
  }, 0);
  const vat = subtotal * (vatRate / 100);
  const levy = subtotal * (levyRate / 100);
  const total = subtotal + vat + levy;
  return { subtotal, vat, levy, total };
}

export function genJobNumber(seq: number) {
  return `JOB-${String(seq).padStart(4, "0")}`;
}

export function genInvoiceNumber(seq: number) {
  return `INV-${String(seq).padStart(4, "0")}`;
}

export const JOB_STATUS_LABELS: Record<string, string> = {
  INTAKE: "Intake",
  DIAGNOSING: "Diagnosing",
  AWAITING_PARTS: "Awaiting Parts",
  IN_PROGRESS: "In Progress",
  READY_FOR_PICKUP: "Ready for Pickup",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const JOB_STATUS_ORDER = [
  "INTAKE",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
  "READY_FOR_PICKUP",
  "COMPLETED",
];
