// Unified hook called whenever the `subscriptions` row for a user is
// inserted or updated by ANY pathway (Stripe webhook, MP webhook,
// reconcile fallback, admin comp grant). Centralizes the side effects
// that need to fire post-UPSERT — currently:
//
// 1. Revalidate the dashboard layout so the gating UI re-renders.
// 2. Revalidate the player's public slug if it changed plan tier.
//
// Welcome / receipt emails are NOT here on purpose — those are handled
// inside the per-processor handlers (`stripe.ts::maybeSendWelcome`)
// which have access to the planId / trial / nextChargeAt context.

import "server-only";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { playerProfiles, agencyProfiles, userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export type SubscriptionChangeContext = {
  userId: string;
  /** Previous coarse plan tier ('free' | 'pro' | 'pro_plus' | null). */
  previousPlan: string | null;
  /** New coarse plan tier after the UPSERT. */
  nextPlan: string | null;
  /** Optional source label for diagnostics ('stripe' | 'mp' | 'reconcile' | 'admin_grant'). */
  source?: string;
};

/**
 * Fire side-effects after a subscription row changes. Idempotent: safe to
 * call from multiple pathways for the same UPSERT.
 *
 * Does NOT throw — any failure is logged. This is a side-effect hook,
 * not a critical-path mutation.
 */
export async function runSubscriptionSideEffects(ctx: SubscriptionChangeContext): Promise<void> {
  const planChanged = ctx.previousPlan !== ctx.nextPlan;

  try {
    // Always revalidate the dashboard layout. Even when the plan tier
    // stays the same, status fields (trialing → active, cancel_at_period_end)
    // matter for banners.
    revalidatePath("/dashboard", "layout");

    if (planChanged) {
      // Plan-tier flip: also bust the public profile/portfolio caches so
      // the LayoutResolver re-runs.
      const userProfile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, ctx.userId),
        columns: { role: true, agencyId: true },
      });

      if (userProfile?.role === "manager" && userProfile.agencyId) {
        const agency = await db.query.agencyProfiles.findFirst({
          where: eq(agencyProfiles.id, userProfile.agencyId),
          columns: { slug: true },
        });
        if (agency?.slug) revalidatePath(`/agency/${agency.slug}`, "page");
      } else {
        const player = await db.query.playerProfiles.findFirst({
          where: eq(playerProfiles.userId, ctx.userId),
          columns: { slug: true },
        });
        if (player?.slug) revalidatePath(`/${player.slug}`, "page");
      }
    }
  } catch (err) {
    console.warn(
      "[runSubscriptionSideEffects] revalidate failed (non-fatal):",
      err instanceof Error ? err.message : err,
      { userId: ctx.userId, source: ctx.source },
    );
  }
}
