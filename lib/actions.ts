"use server";

import { db } from "@/db";
import {
  customers,
  vehicles,
  jobs,
  invoices,
  invoiceItems,
  payments,
  parts,
  messageLogs,
  inspectionItems,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { genJobNumber, genInvoiceNumber, calcInvoiceTotals } from "@/lib/utils";
import { sendWhatsAppText, messageTemplates } from "@/lib/whatsapp";
import { requireSession } from "@/lib/session";

// ---------- Customers & Vehicles ----------

export async function createCustomer(formData: FormData) {
  await requireSession();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;
  if (!name || !phone) throw new Error("Name and phone are required");

  const [customer] = await db.insert(customers).values({ name, phone, email, address }).returning();

  const make = String(formData.get("make") || "").trim();
  const model = String(formData.get("model") || "").trim();
  const plate = String(formData.get("plate") || "").trim();
  if (make && model && plate) {
    await db.insert(vehicles).values({
      customerId: customer.id,
      make,
      model,
      plate,
      year: Number(formData.get("year")) || null,
      vin: String(formData.get("vin") || "") || null,
      color: String(formData.get("color") || "") || null,
      mileage: Number(formData.get("mileage")) || 0,
    });
  }

  revalidatePath("/dashboard/customers");
  redirect(`/dashboard/customers/${customer.id}`);
}

export async function addVehicle(customerId: number, formData: FormData) {
  await requireSession();
  await db.insert(vehicles).values({
    customerId,
    make: String(formData.get("make") || ""),
    model: String(formData.get("model") || ""),
    plate: String(formData.get("plate") || ""),
    year: Number(formData.get("year")) || null,
    vin: String(formData.get("vin") || "") || null,
    color: String(formData.get("color") || "") || null,
    mileage: Number(formData.get("mileage")) || 0,
  });
  revalidatePath(`/dashboard/customers/${customerId}`);
}

// ---------- Jobs ----------

export async function createJob(formData: FormData) {
  await requireSession();
  const vehicleId = Number(formData.get("vehicleId"));
  const reportedIssue = String(formData.get("reportedIssue") || "");
  const mileageIn = Number(formData.get("mileageIn")) || null;

  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
  if (!vehicle) throw new Error("Vehicle not found");
  const customerId = vehicle.customerId;

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(jobs);
  const [job] = await db
    .insert(jobs)
    .values({
      jobNumber: genJobNumber(count + 1),
      vehicleId,
      customerId,
      reportedIssue,
      mileageIn,
      status: "INTAKE",
    })
    .returning();

  revalidatePath("/dashboard/jobs");
  redirect(`/dashboard/jobs/${job.id}`);
}

export async function updateJobStatus(jobId: number, status: string) {
  await requireSession();
  const [job] = await db
    .update(jobs)
    .set({ status: status as any, updatedAt: new Date(), completedAt: status === "COMPLETED" ? new Date() : null })
    .where(eq(jobs.id, jobId))
    .returning();

  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, job.vehicleId)).limit(1);
  const [customer] = await db.select().from(customers).where(eq(customers.id, job.customerId)).limit(1);

  if (customer && vehicle) {
    const label =
      status === "READY_FOR_PICKUP"
        ? messageTemplates.vehicleReady(customer.name, vehicle.plate)
        : messageTemplates.jobStatusUpdate(customer.name, vehicle.plate, status.replaceAll("_", " ").toLowerCase());
    try {
      await sendWhatsAppText(customer.phone, label);
      await db.insert(messageLogs).values({ customerId: customer.id, jobId: job.id, channel: "WHATSAPP", content: label, status: "SENT" });
    } catch (e) {
      await db.insert(messageLogs).values({ customerId: customer.id, jobId: job.id, channel: "WHATSAPP", content: label, status: "FAILED" });
    }
  }

  revalidatePath(`/dashboard/jobs/${jobId}`);
  revalidatePath("/dashboard/jobs");
}

export async function assignTechnician(jobId: number, userId: number) {
  await requireSession();
  await db.update(jobs).set({ assignedToId: userId, updatedAt: new Date() }).where(eq(jobs.id, jobId));
  revalidatePath(`/dashboard/jobs/${jobId}`);
}

export async function addInspectionItem(jobId: number, formData: FormData) {
  await requireSession();
  await db.insert(inspectionItems).values({
    jobId,
    item: String(formData.get("item") || ""),
    condition: String(formData.get("condition") || "GOOD") as any,
    note: String(formData.get("note") || "") || null,
  });
  revalidatePath(`/dashboard/jobs/${jobId}`);
}

// ---------- Invoices ----------

export async function createInvoiceForJob(jobId: number) {
  await requireSession();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) throw new Error("Job not found");

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(invoices);
  const [invoice] = await db
    .insert(invoices)
    .values({
      invoiceNumber: genInvoiceNumber(count + 1),
      jobId: job.id,
      customerId: job.customerId,
      status: "DRAFT",
    })
    .returning();

  revalidatePath(`/dashboard/jobs/${jobId}`);
  redirect(`/dashboard/invoices/${invoice.id}`);
}

export async function addInvoiceItem(invoiceId: number, formData: FormData) {
  await requireSession();
  await db.insert(invoiceItems).values({
    invoiceId,
    type: String(formData.get("type") || "PART") as any,
    description: String(formData.get("description") || ""),
    quantity: String(formData.get("quantity") || "1"),
    unitPrice: String(formData.get("unitPrice") || "0"),
  });
  await recalcInvoiceTotals(invoiceId);
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
}

export async function removeInvoiceItem(invoiceId: number, itemId: number) {
  await requireSession();
  await db.delete(invoiceItems).where(eq(invoiceItems.id, itemId));
  await recalcInvoiceTotals(invoiceId);
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
}

async function recalcInvoiceTotals(invoiceId: number) {
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  const { subtotal, total } = calcInvoiceTotals(items, Number(invoice.vatRate), Number(invoice.levyRate));
  await db.update(invoices).set({ subtotal: subtotal.toFixed(2), total: total.toFixed(2) }).where(eq(invoices.id, invoiceId));
}

export async function sendInvoiceToCustomer(invoiceId: number) {
  await requireSession();
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  const [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId)).limit(1);
  const [job] = await db.select().from(jobs).where(eq(jobs.id, invoice.jobId)).limit(1);
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, job.vehicleId)).limit(1);

  const link = `${process.env.NEXTAUTH_URL}/dashboard/invoices/${invoiceId}`;
  const msg = messageTemplates.quoteReady(customer.name, vehicle.plate, invoice.total, link);

  try {
    await sendWhatsAppText(customer.phone, msg);
    await db.insert(messageLogs).values({ customerId: customer.id, jobId: job.id, channel: "WHATSAPP", content: msg, status: "SENT" });
  } catch {
    await db.insert(messageLogs).values({ customerId: customer.id, jobId: job.id, channel: "WHATSAPP", content: msg, status: "FAILED" });
  }

  await db.update(invoices).set({ status: "SENT" }).where(eq(invoices.id, invoiceId));
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
}

export async function recordManualPayment(invoiceId: number, formData: FormData) {
  await requireSession();
  const amount = String(formData.get("amount") || "0");
  const method = String(formData.get("method") || "CASH") as any;
  const reference = String(formData.get("reference") || "") || null;

  await db.insert(payments).values({ invoiceId, amount, method, reference });

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  const allPayments = await db.select().from(payments).where(eq(payments.invoiceId, invoiceId));
  const paid = allPayments.reduce((s, p) => s + Number(p.amount), 0);
  const newStatus = paid >= Number(invoice.total) ? "PAID" : paid > 0 ? "PARTIAL" : invoice.status;
  await db.update(invoices).set({ amountPaid: paid.toFixed(2), status: newStatus as any }).where(eq(invoices.id, invoiceId));

  const [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId)).limit(1);
  const [job] = await db.select().from(jobs).where(eq(jobs.id, invoice.jobId)).limit(1);
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, job.vehicleId)).limit(1);
  const msg = messageTemplates.paymentReceived(customer.name, amount, vehicle.plate);
  try {
    await sendWhatsAppText(customer.phone, msg);
    await db.insert(messageLogs).values({ customerId: customer.id, jobId: job.id, channel: "WHATSAPP", content: msg, status: "SENT" });
  } catch {
    /* non-fatal */
  }

  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  revalidatePath("/dashboard/payments");
}

// ---------- Inventory ----------

export async function addPart(formData: FormData) {
  await requireSession();
  await db.insert(parts).values({
    name: String(formData.get("name") || ""),
    sku: String(formData.get("sku") || "") || null,
    quantity: Number(formData.get("quantity")) || 0,
    costPrice: String(formData.get("costPrice") || "0"),
    sellPrice: String(formData.get("sellPrice") || "0"),
    lowStockThreshold: Number(formData.get("lowStockThreshold")) || 3,
  });
  revalidatePath("/dashboard/inventory");
}

export async function adjustPartStock(partId: number, delta: number) {
  await requireSession();
  await db
    .update(parts)
    .set({ quantity: sql`${parts.quantity} + ${delta}` })
    .where(eq(parts.id, partId));
  revalidatePath("/dashboard/inventory");
}

// ---------- Manual customer message ----------

export async function sendCustomMessage(customerId: number, jobId: number | null, content: string) {
  await requireSession();
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  let status = "SENT";
  try {
    await sendWhatsAppText(customer.phone, content);
  } catch {
    status = "FAILED";
  }
  await db.insert(messageLogs).values({ customerId, jobId: jobId ?? null, channel: "WHATSAPP", content, status });
  if (jobId) revalidatePath(`/dashboard/jobs/${jobId}`);
  revalidatePath(`/dashboard/customers/${customerId}`);
}
