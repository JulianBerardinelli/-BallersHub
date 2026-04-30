import { NextResponse } from "next/server";
import { and, eq, lte } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { marketingCampaigns } from "@/db/schema";
import { processDueEnrollments } from "@/lib/marketing";
import { cooldownDormantSubscribers } from "@/lib/marketing/engagement";
import { dispatchCampaignNow } from "@/app/(dashboard)/admin/marketing/actions";

/**
 * Cron entrypoint — fires both:
 *   1. Scheduled campaigns whose `scheduled_at <= now()`
 *   2. Drip enrollments whose `scheduled_for <= now()`
 *
 * Auth: requires `CRON_SECRET` matching either:
 *   - `Authorization: Bearer <secret>` (Vercel Cron's standard)
 *   - `?secret=<secret>` query param (manual trigger)
 *
 * Idempotent and safe to call multiple times concurrently — both
 * processors atomically lock rows before sending.
 *
 * Schedule (vercel.json): every 5 minutes. Tighten to 1 minute later
 * if drip latency becomes a UX issue.
 */
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return run(req);
}
export async function POST(req: Request) {
  return run(req);
}

async function run(req: Request) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();

  // 1) Fire scheduled campaigns. Each call is bounded — runCampaign
  //    handles batching/throttling internally.
  const dueCampaigns = await db.query.marketingCampaigns.findMany({
    where: and(
      eq(marketingCampaigns.status, "scheduled"),
      lte(marketingCampaigns.scheduledAt, new Date()),
    ),
    columns: { id: true, slug: true },
  });

  const campaignResults: Array<{ id: string; slug: string; ok: boolean; sent?: number; error?: string }> = [];
  for (const c of dueCampaigns) {
    try {
      const r = await dispatchCampaignNow({ campaignId: c.id, applyFrequencyCap: true });
      if (r.ok) {
        campaignResults.push({ id: c.id, slug: c.slug, ok: true, sent: r.sent });
      } else {
        campaignResults.push({ id: c.id, slug: c.slug, ok: false, error: r.error });
      }
    } catch (e) {
      campaignResults.push({
        id: c.id,
        slug: c.slug,
        ok: false,
        error: e instanceof Error ? e.message : "unknown error",
      });
    }
  }

  // 2) Process due drip enrollments
  const dripResult = await processDueEnrollments();

  // 3) Cool down dormant subscribers (anyone with 6+ consecutive
  //    skipped sends gets moved to the suppression list). The helper
  //    only scans non-suppressed addresses and caps at 500 per tick,
  //    so it's safe to run on every cron invocation.
  const cooldownResult = await cooldownDormantSubscribers();

  return NextResponse.json({
    ok: true,
    elapsedMs: Date.now() - startedAt,
    campaigns: {
      total: dueCampaigns.length,
      results: campaignResults,
    },
    drips: dripResult,
    engagement: cooldownResult,
  });
}

function verifyCronAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("[cron] CRON_SECRET not set — refusing to run.");
    return false;
  }

  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : null;

  const provided = querySecret ?? bearer ?? "";
  return safeEquals(provided, secret);
}

function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
