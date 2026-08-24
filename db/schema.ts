import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["OWNER", "FRONT_DESK", "TECHNICIAN", "ACCOUNTANT"]);
export const jobStatusEnum = pgEnum("job_status", [
  "INTAKE",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["DRAFT", "SENT", "PARTIAL", "PAID", "VOID"]);
export const paymentMethodEnum = pgEnum("payment_method", ["CASH", "MOMO", "CARD", "BANK_TRANSFER", "PAYSTACK"]);
export const conditionEnum = pgEnum("condition", ["GOOD", "WARNING", "URGENT"]);
export const channelEnum = pgEnum("channel", ["WHATSAPP", "SMS"]);
export const lineItemTypeEnum = pgEnum("line_item_type", ["PART", "LABOR", "FEE"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("FRONT_DESK"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  whatsappOptIn: integer("whatsapp_opt_in").default(1).notNull(),
  email: varchar("email", { length: 160 }),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  make: varchar("make", { length: 60 }).notNull(),
  model: varchar("model", { length: 60 }).notNull(),
  year: integer("year"),
  plate: varchar("plate", { length: 32 }).notNull(),
  vin: varchar("vin", { length: 64 }),
  color: varchar("color", { length: 40 }),
  mileage: integer("mileage").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  jobNumber: varchar("job_number", { length: 24 }).notNull().unique(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  reportedIssue: text("reported_issue").notNull(),
  mileageIn: integer("mileage_in"),
  status: jobStatusEnum("status").notNull().default("INTAKE"),
  assignedToId: integer("assigned_to_id").references(() => users.id),
  internalNotes: text("internal_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const inspectionItems = pgTable("inspection_items", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  item: varchar("item", { length: 120 }).notNull(),
  condition: conditionEnum("condition").notNull().default("GOOD"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 24 }).notNull().unique(),
  jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  status: invoiceStatusEnum("status").notNull().default("DRAFT"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("15"),
  levyRate: numeric("levy_rate", { precision: 5, scale: 2 }).notNull().default("6"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  dueAt: timestamp("due_at"),
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  type: lineItemTypeEnum("type").notNull().default("PART"),
  description: varchar("description", { length: 200 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method: paymentMethodEnum("method").notNull().default("CASH"),
  reference: varchar("reference", { length: 120 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const parts = pgTable("parts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  sku: varchar("sku", { length: 60 }),
  quantity: integer("quantity").notNull().default(0),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull().default("0"),
  sellPrice: numeric("sell_price", { precision: 12, scale: 2 }).notNull().default("0"),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(3),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messageLogs = pgTable("message_logs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
  channel: channelEnum("channel").notNull().default("WHATSAPP"),
  content: text("content").notNull(),
  status: varchar("status", { length: 40 }).notNull().default("SENT"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const customersRelations = relations(customers, ({ many }) => ({
  vehicles: many(vehicles),
  jobs: many(jobs),
  messages: many(messageLogs),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  customer: one(customers, { fields: [vehicles.customerId], references: [customers.id] }),
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  vehicle: one(vehicles, { fields: [jobs.vehicleId], references: [vehicles.id] }),
  customer: one(customers, { fields: [jobs.customerId], references: [customers.id] }),
  assignedTo: one(users, { fields: [jobs.assignedToId], references: [users.id] }),
  inspectionItems: many(inspectionItems),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  job: one(jobs, { fields: [invoices.jobId], references: [jobs.id] }),
  customer: one(customers, { fields: [invoices.customerId], references: [customers.id] }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
}));
