import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __dbClient: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL as string;

const client =
  global.__dbClient ??
  postgres(connectionString, { max: 1, ssl: connectionString.includes("localhost") ? false : "require" });

if (process.env.NODE_ENV !== "production") global.__dbClient = client;

export const db = drizzle(client, { schema });
