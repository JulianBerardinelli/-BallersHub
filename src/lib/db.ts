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
    idle_timeout: 5, // close idle conns after 5s
    connect_timeout: 10,
    max_lifetime: 60, // recycle every minute — caps damage from a stuck slot
    // Socket-level TCP keepalive. When Vercel kills the lambda the TCP
    // socket is closed, but pgbouncer / Supavisor only notices once the
    // kernel sends a probe and gets RST. Defaults can be hours; this
    // forces probes every ~30s so dead sockets are reaped quickly.
    connection: {
      // PG-level timeouts. Multiple knobs because the ClientRead zombie
      // can be reached from different state machines and only some apply
      // depending on what postgres-js was doing when Vercel killed the
      // lambda. Codex pointed this out on PR #71:
      //   - statement_timeout: applies while a query IS executing
      //   - idle_in_transaction_session_timeout: state="idle in transaction"
      //   - idle_session_timeout: state="idle" between queries
      //   - tcp_keepalives_*: catches dead TCP sockets regardless of state
      //   - client_connection_check_interval: best-effort during query
      statement_timeout: 8000, // 8s (under Vercel Hobby 10s limit)
      idle_in_transaction_session_timeout: 10000, // 10s
      idle_session_timeout: 30000, // 30s — kill sessions idle between queries
      client_connection_check_interval: 5000,
      // TCP keepalive (PGC_USERSET, so safe in connection startup). After
      // 30s of TCP silence, send a probe. Up to 3 probes 10s apart. Dead
      // socket detected within ~60s worst case.
      tcp_keepalives_idle: 30,
      tcp_keepalives_interval: 10,
      tcp_keepalives_count: 3,
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

