// Auto-repair stale `subscriptions` rows where the legacy `plan` column
// disagrees with `status_v2` + `plan_id`.
//
// Background: until the Stripe/MP webhook handlers were fixed (2026-05-09),
// a paid-then-trialing user could end up with:
//   plan='free' AND status_v2='trialing' AND plan_id='pro-player'
// which made the gating UI block them as Free even though they paid.
//
// `resolvePlanAccess` in current code already treats those rows as Pro
// (status_v2 + plan_id are the source of truth), so end users no longer
// see broken gating. But the row itself still has a stale `plan` column,
// which any third-party admin tool / SQL Editor / future code reading
// `plan` directly might surface as a bug. This script normalizes them.
//
// Idempotent: safe to run multiple times. Dry-run by default; pass
// `--apply` to actually update.
//
// Usage:
//   node --env-file=.env.local --import tsx scripts/repair-stale-pro-rows.ts
//   node --env-file=.env.local --import tsx scripts/repair-stale-pro-rows.ts --apply

import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, inArray } from "drizzle-orm";
import * as schema from "../src/db/schema/index.js";

const APPLY = process.argv.includes("--apply");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set. Add it to .env.local first.");
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });
  const db = drizzle(sql, { schema });

  // Find rows where the legacy `plan` column disagrees with the truth
  // signals. Two signatures:
  //   A: trialing/active sub with pro plan_id but legacy plan='free'
  //   B: canceled/past_due sub with legacy plan='pro' that should be 'free'
  //      (less critical — the resolver already collapses to free, but it's
  //      cleaner to align the column.)

  const proLookalikes = await db
    .select({
      id: schema.subscriptions.id,
      userId: schema.subscriptions.userId,
      plan: schema.subscriptions.plan,
      statusV2: schema.subscriptions.statusV2,
      planId: schema.subscriptions.planId,
      processor: schema.subscriptions.processor,
    })
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.plan, "free"),
        inArray(schema.subscriptions.statusV2, ["trialing", "active", "past_due"]),
        inArray(schema.subscriptions.planId, ["pro-player", "pro-agency"]),
      ),
    );

  const freeLookalikes = await db
    .select({
      id: schema.subscriptions.id,
      userId: schema.subscriptions.userId,
      plan: schema.subscriptions.plan,
      statusV2: schema.subscriptions.statusV2,
      planId: schema.subscriptions.planId,
    })
    .from(schema.subscriptions)
    .where(
      and(
        inArray(schema.subscriptions.plan, ["pro", "pro_plus"]),
        inArray(schema.subscriptions.statusV2, ["canceled", "incomplete"]),
      ),
    );

  console.log(`\nFound ${proLookalikes.length} pro-lookalike rows (plan='free' but should be 'pro'):`);
  for (const r of proLookalikes) {
    console.log(
      `  user=${r.userId.slice(0, 8)}… plan=${r.plan} → would set 'pro' · status_v2=${r.statusV2} planId=${r.planId} processor=${r.processor ?? "comp_grant"}`,
    );
  }

  console.log(`\nFound ${freeLookalikes.length} free-lookalike rows (plan='pro' but should be 'free'):`);
  for (const r of freeLookalikes) {
    console.log(
      `  user=${r.userId.slice(0, 8)}… plan=${r.plan} → would set 'free' · status_v2=${r.statusV2}`,
    );
  }

  const total = proLookalikes.length + freeLookalikes.length;
  if (total === 0) {
    console.log("\n✓ No stale rows. Nothing to repair.");
    await sql.end();
    return;
  }

  if (!APPLY) {
    console.log(`\n[dry-run] ${total} rows would be repaired. Re-run with --apply to commit.`);
    await sql.end();
    return;
  }

  console.log(`\n[apply] Updating ${total} rows…`);
  let updated = 0;

  for (const r of proLookalikes) {
    const statusForLegacy = r.statusV2 === "trialing" ? "trialing" : "active";
    await db
      .update(schema.subscriptions)
      .set({ plan: "pro", status: statusForLegacy, updatedAt: new Date() })
      .where(eq(schema.subscriptions.id, r.id));
    updated++;
  }

  for (const r of freeLookalikes) {
    await db
      .update(schema.subscriptions)
      .set({ plan: "free", status: r.statusV2 ?? "canceled", updatedAt: new Date() })
      .where(eq(schema.subscriptions.id, r.id));
    updated++;
  }

  console.log(`✓ Repaired ${updated} rows.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
