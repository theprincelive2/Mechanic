import "dotenv/config";
import { db } from "./index";
import { users, customers, vehicles, jobs, invoices, invoiceItems, parts } from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  const [owner] = await db
    .insert(users)
    .values({
      name: "Shop Owner",
      email: "owner@eastlegonauto.com",
      passwordHash: await bcrypt.hash("changeme123", 10),
      role: "OWNER",
    })
    .returning();

  const [tech] = await db
    .insert(users)
    .values({
      name: "Kwame Mensah",
      email: "kwame@eastlegonauto.com",
      passwordHash: await bcrypt.hash("changeme123", 10),
      role: "TECHNICIAN",
    })
    .returning();

  const [customer] = await db
    .insert(customers)
    .values({
      name: "Ama Boateng",
      phone: "+233241234567",
      email: "ama@example.com",
      address: "East Legon, Accra",
    })
    .returning();

  const [vehicle] = await db
    .insert(vehicles)
    .values({
      customerId: customer.id,
      make: "Toyota",
      model: "Camry",
      year: 2019,
      plate: "GR 1234-20",
      vin: "4T1BF1FK5KU123456",
      color: "Silver",
      mileage: 62000,
    })
    .returning();

  const [job] = await db
    .insert(jobs)
    .values({
      jobNumber: "JOB-0001",
      vehicleId: vehicle.id,
      customerId: customer.id,
      reportedIssue: "Squeaking noise from front brakes, requesting oil change",
      mileageIn: 62000,
      status: "IN_PROGRESS",
      assignedToId: tech.id,
    })
    .returning();

  const [invoice] = await db
    .insert(invoices)
    .values({
      invoiceNumber: "INV-0001",
      jobId: job.id,
      customerId: customer.id,
      status: "DRAFT",
      subtotal: "0",
      total: "0",
    })
    .returning();

  const seedItems = [
    { invoiceId: invoice.id, type: "PART" as const, description: "Front brake pads (set)", quantity: "1", unitPrice: "450" },
    { invoiceId: invoice.id, type: "LABOR" as const, description: "Brake pad replacement labor", quantity: "1", unitPrice: "150" },
    { invoiceId: invoice.id, type: "PART" as const, description: "Engine oil 5W-30 (5L)", quantity: "1", unitPrice: "280" },
    { invoiceId: invoice.id, type: "LABOR" as const, description: "Oil & filter change", quantity: "1", unitPrice: "100" },
  ];
  await db.insert(invoiceItems).values(seedItems);

  const subtotal = seedItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
  const vatRate = Number(invoice.vatRate);
  const levyRate = Number(invoice.levyRate);
  const total = subtotal + subtotal * (vatRate / 100) + subtotal * (levyRate / 100);
  await db.update(invoices).set({ subtotal: subtotal.toFixed(2), total: total.toFixed(2) }).where(eq(invoices.id, invoice.id));

  await db.insert(parts).values([
    { name: "Brake pads (Toyota Camry)", sku: "BP-CAM-01", quantity: 8, costPrice: "300", sellPrice: "450", lowStockThreshold: 3 },
    { name: "Engine oil 5W-30 5L", sku: "OIL-5W30-5L", quantity: 2, costPrice: "200", sellPrice: "280", lowStockThreshold: 4 },
    { name: "Oil filter (universal)", sku: "FLT-UNI-01", quantity: 15, costPrice: "35", sellPrice: "60", lowStockThreshold: 5 },
  ]);

  console.log("Seed complete.");
  console.log("Login: owner@eastlegonauto.com / changeme123");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
