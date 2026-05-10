// src/app/onboarding/player/plan/page.tsx
//
// Legacy page kept around only because external links / drip emails
// may still point at it. The plan/pricing decision now lives at
// /pricing → /checkout/[planId]. We redirect users based on whether
// they already paid:
//   - active sub  → /onboarding/player/apply (continue KYC)
//   - no sub      → /pricing (canonical plan picker)
//
// `pro_plus` was removed from the catalog; references in the rest of
// the codebase are legacy schema columns and search filters that
// don't surface to users anymore.

import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function PlayerPlanPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/pricing");

  // IMPORTANT: keep the lookup inside try/catch (DB hiccup tolerance) but
  // run the redirects AFTER — `redirect()` throws `NEXT_REDIRECT` as
  // control-flow and a generic catch would swallow it, breaking the skip.
  let activeSubPlanId: string | null = null;
  try {
    const [activeSub] = await db
      .select({ planId: subscriptions.planId })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.id),
          inArray(subscriptions.statusV2, ["trialing", "active", "past_due"]),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    activeSubPlanId = activeSub?.planId ?? null;
  } catch {
    // Non-fatal: fall through to /pricing.
  }

  if (activeSubPlanId === "pro-player") {
    redirect("/onboarding/player/apply");
  }
  if (activeSubPlanId === "pro-agency") {
    redirect("/onboarding/manager/info");
  }

  redirect("/pricing");
}
