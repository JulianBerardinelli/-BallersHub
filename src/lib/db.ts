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
    // Vercel lambdas can sit idle between invocations; Supabase pooler drops
    // idle connections after ~10 min. Without these timeouts a stale socket
    // can hang the next request until the Vercel function timeout fires.
    idle_timeout: 20, // recycle connections idle >20s
    connect_timeout: 10, // bail out new connection attempts after 10s
    max_lifetime: 60 * 30, // hard cap connection age at 30 min
    // Defense in depth: cap server-side execution AND idle-in-transaction
    // time so a hanging query never holds the pooler slot long enough to
    // block subsequent requests (the postgres-js ClientRead hang we saw
    // in prod). Postgres aborts the query → postgres-js throws → caller
    // sees a normal error instead of a frozen connection.
    connection: {
      statement_timeout: "8000", // 8s (under Vercel Hobby 10s limit)
      idle_in_transaction_session_timeout: "10000", // 10s
    },
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

