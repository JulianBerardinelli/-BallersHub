// lib/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema"; // ⬅️ Importá TODO tu schema

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const connectionString = process.env.DATABASE_URL;

// Prevent multiple connections during Next.js Hot Module Replacement (HMR)
const globalForPostgres = globalThis as unknown as {
  postgresClient: postgres.Sql | undefined;
};

const client = globalForPostgres.postgresClient ?? postgres(connectionString, { 
  prepare: false,
  max: 1 // Cap connection pool per worker to prevent MaxClientsInSessionMode in dev
});

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.postgresClient = client;
}

export const db = drizzle(client, { schema });

