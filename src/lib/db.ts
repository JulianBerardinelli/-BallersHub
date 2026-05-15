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
    // Aggressive recycling — when Vercel kills a lambda mid-query the
    // pooler slot gets stuck in `wait_event=ClientRead`. statement_timeout
    // does NOT cover that state (the query is "done" from PG's POV, just
    // waiting on a dead client). The real fix is server-side connection
    // health checks + tight max_lifetime so a poisoned slot cannot
    // outlive a single function invocation by much.
    idle_timeout: 5, // close idle conns after 5s
    connect_timeout: 10,
    max_lifetime: 60, // recycle every minute — caps damage from a stuck slot
    connection: {
      statement_timeout: 8000, // 8s (under Vercel Hobby 10s limit)
      idle_in_transaction_session_timeout: 10000, // 10s
      // Postgres 14+: server pings TCP every 5s and closes if the client
      // is gone. This is what actually frees a `ClientRead` zombie after
      // Vercel kills the owning lambda — without it the slot stays held
      // until max_lifetime expires.
      client_connection_check_interval: 5000,
    } as Record<string, number>,
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

