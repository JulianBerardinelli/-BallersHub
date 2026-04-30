// lib/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema"; // ⬅️ Importá TODO tu schema

// Prevent multiple connections during Next.js Hot Module Replacement (HMR)
const globalForPostgres = globalThis as unknown as {
  postgresClient: postgres.Sql | undefined;
};

function makeDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = globalForPostgres.postgresClient ?? postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: 1, // Cap connection pool per worker to prevent MaxClientsInSessionMode in dev
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPostgres.postgresClient = client;
  }

  return drizzle(client, { schema });
}

type Db = ReturnType<typeof makeDb>;

let _db: Db | null = null;

// Lazy proxy: defers DATABASE_URL validation until first use, so Next.js
// build-time module evaluation (collect page data) doesn't crash when
// the env isn't injected into the build phase.
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    if (!_db) _db = makeDb();
    return Reflect.get(_db as object, prop, receiver);
  },
});

