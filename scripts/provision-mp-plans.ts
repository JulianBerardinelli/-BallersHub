/**
 * Provision the Mercado Pago `preapproval_plan` ids for BallersHub
 * subscriptions. One-time setup — run once per MP application.
 *
 * Why: the `/preapproval` direct endpoint silently drops `free_trial`,
 * so we cannot offer a 7-day trial via inline auto_recurring. The fix
 * is to create abstract `preapproval_plan` resources (which DO honor
 * `free_trial`) and have the runtime create preapprovals that reference
 * the plan by id. MP handles trial accounting on its side.
 *
 * Usage:
 *   1. Make sure `.env.local` has the LIVE `MP_ACCESS_TOKEN` (APP_USR-*).
 *   2. From repo root: `npx tsx scripts/provision-mp-plans.ts`
 *   3. The script prints the 2 plan ids — copy them into Vercel as:
 *        MP_PLAN_PRO_PLAYER_ARS  →  <pro-player id>
 *        MP_PLAN_PRO_AGENCY_ARS  →  <pro-agency id>
 *      Scope to Production + Preview as needed.
 *   4. Redeploy production. Done.
 *
 * Idempotency: the script does NOT check for existing plans on the seller
 * before creating new ones. Run it once. If you accidentally run it
 * twice you'll have duplicate plans — both work, but only the env-pinned
 * ones get used at checkout. The orphans are inert.
 *
 * Re-creating a plan with a different amount: MP plans are immutable
 * once they have subscribers. To change price, create a NEW plan, update
 * the env var, and existing subscribers stay on the old plan.
 */

import { config as loadEnv } from "dotenv";
import * as path from "node:path";

loadEnv({ path: path.join(process.cwd(), ".env.local") });

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN?.trim();
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://ballershub.co";

if (!ACCESS_TOKEN) {
  console.error("Missing MP_ACCESS_TOKEN in .env.local");
  process.exit(1);
}

if (!ACCESS_TOKEN.startsWith("APP_USR-")) {
  console.error(
    "MP_ACCESS_TOKEN should start with APP_USR-* (live or test-seller production credential). The legacy TEST-* sandbox format does not work for Subscriptions API.",
  );
  process.exit(1);
}

const TRIAL_DAYS = 7;

type PlanSpec = {
  envKey: string;
  reason: string;
  amount: number;
  externalRef: string;
};

const PLANS: PlanSpec[] = [
  {
    envKey: "MP_PLAN_PRO_PLAYER_ARS",
    reason: "'BallersHub Pro Player — Suscripción anual",
    amount: 131_999,
    externalRef: "pro-player-ars",
  },
  {
    envKey: "MP_PLAN_PRO_AGENCY_ARS",
    reason: "'BallersHub Pro Agency — Suscripción anual",
    amount: 264_999,
    externalRef: "pro-agency-ars",
  },
];

type CreatePlanBody = {
  reason: string;
  external_reference: string;
  back_url: string;
  auto_recurring: {
    frequency: number;
    frequency_type: "months";
    transaction_amount: number;
    currency_id: "ARS";
    free_trial: {
      frequency: number;
      frequency_type: "days";
    };
  };
};

async function createPlan(spec: PlanSpec): Promise<string> {
  const body: CreatePlanBody = {
    reason: spec.reason,
    external_reference: spec.externalRef,
    back_url: `${APP_URL}/checkout/processing`,
    auto_recurring: {
      frequency: 12,
      frequency_type: "months",
      transaction_amount: spec.amount,
      currency_id: "ARS",
      free_trial: {
        frequency: TRIAL_DAYS,
        frequency_type: "days",
      },
    },
  };

  const res = await fetch("https://api.mercadopago.com/preapproval_plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as { id?: string; message?: string };

  if (!res.ok || !json.id) {
    console.error(
      `Failed to create plan "${spec.reason}" (HTTP ${res.status}):`,
      json,
    );
    process.exit(1);
  }

  return json.id;
}

async function main() {
  console.log("Provisioning Mercado Pago preapproval_plans...");
  console.log(`  APP_URL: ${APP_URL}`);
  console.log(`  Trial: ${TRIAL_DAYS} days`);
  console.log();

  const results: { envKey: string; planId: string }[] = [];

  for (const spec of PLANS) {
    process.stdout.write(`Creating ${spec.reason}... `);
    const planId = await createPlan(spec);
    console.log(`OK → ${planId}`);
    results.push({ envKey: spec.envKey, planId });
  }

  console.log();
  console.log("=".repeat(60));
  console.log("DONE. Add these to Vercel (Production + Preview):");
  console.log("=".repeat(60));
  for (const r of results) {
    console.log(`${r.envKey}=${r.planId}`);
  }
  console.log();
  console.log("After setting env vars, REDEPLOY production for them to load.");
  console.log("Verify with:");
  console.log("  curl -s https://ballershub.co/api/health  (or hit checkout)");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
