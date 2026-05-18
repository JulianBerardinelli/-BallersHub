// lib/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

// Migration from `postgres-js` → `pg` (node-postgres) — see
// tmp/fixes/PERFORMANCE_PLAN.md (P3) and HANDOFF.md.
//
// Why: the `postgres-js` driver, when combined with the Supabase
// pooler in transaction mode + Vercel functions that get killed at
// the timeout, occasionally left the pooler slot in
// `state=active wait_event=ClientRead` indefinitely. That poisoned
// every subsequent request on the same lambda → 504. We patched it
// via timeouts (statement_timeout, idle_session_timeout,
// tcp_keepalives_*) in PRs #69-#72, then routed the hot admin
// surfaces to Supabase REST (PR #73 P0) to side-step the driver
// entirely. P3 fixes the root cause: `node-postgres` does not have
// the extended-protocol stalling pattern that produced the zombies.
//
// Defensive timeouts at the Postgres session level. With pg replacing
// postgres-js, the ClientRead zombie pattern is gone, so we relax
// from the aggressive 8s `statement_timeout` we ran during the
// post-incident period (PR #71) — 30s is enough for any reasonable
// query and stays well under Vercel's 60s maxDuration. The other
// timeouts stay as belt-and-suspenders for stuck-transaction or
// idle-session edge cases.
const PG_SESSION_OPTIONS = [
  "-c statement_timeout=30000",
  "-c idle_in_transaction_session_timeout=15000",
  "-c idle_session_timeout=60000",
].join(" ");

const globalForPool = globalThis as unknown as {
  pgPool: Pool | undefined;
};

function makePool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    // Match the previous postgres-js setup: one connection per
    // Vercel function instance. The pooler in front (Supavisor in
    // transaction mode) does the actual fan-out.
    max: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    // Recycle every minute as a backstop — if anything still stalls
    // a slot, the lifetime cap reaps it instead of letting it
    // accumulate. Newer `pg` exposes this; ignore the type if your
    // installed version doesn't yet.
    maxLifetimeSeconds: 60,
    // Socket-level TCP keepalive so dead connections from killed
    // Vercel lambdas are detected and dropped by the kernel without
    // waiting for the next read to fail.
    keepAlive: true,
    keepAliveInitialDelayMillis: 30_000,
    // libpq-style runtime parameters applied per session.
    options: PG_SESSION_OPTIONS,
    application_name: "ballershub",
  });
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

// Lazy proxy: defers DATABASE_URL validation until first use, so
// Next.js build-time module evaluation (collect page data) doesn't
// crash when the env isn't injected into the build phase.
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    if (!_db) {
      const pool = globalForPool.pgPool ?? makePool();
      if (process.env.NODE_ENV !== "production") {
        globalForPool.pgPool = pool;
      }
      _db = drizzle(pool, { schema });
    }
    return Reflect.get(_db as object, prop, receiver);
  },
});
