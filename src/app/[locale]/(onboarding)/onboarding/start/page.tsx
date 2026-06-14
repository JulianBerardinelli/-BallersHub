// src/app/onboarding/start/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import {
  hasActiveApplication,
  isApplicationApproved,
  isApplicationDraft,
  normalizeApplicationStatus,
} from "@/lib/dashboard/client/application-status";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { db } from "@/lib/db";
import {
  agencyInvites,
  userProfiles,
  managerProfiles,
  subscriptions,
} from "@/db/schema";
import { and, eq, inArray, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/onboarding/start");

  // Active subscription shortcut: if the user already paid (via /pricing
  // → /checkout), the planId tells us their intended role. Skip the
  // role chooser entirely and route to the specific onboarding flow.
  // Trade-off: the user can no longer change their mind here. They'd
  // need to cancel the subscription from settings first.
  //
  // IMPORTANT: `redirect()` throws `NEXT_REDIRECT` as control-flow. We do
  // the lookup inside the try/catch (so a DB hiccup doesn't crash the
  // page) but the redirects must run AFTER, in normal flow.
  let activeSubPlanId: string | null = null;
  try {
    const [activeSub] = await db
      .select({
        planId: subscriptions.planId,
        statusV2: subscriptions.statusV2,
      })
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
    // Non-fatal — fall through to the regular onboarding chooser.
  }

  if (activeSubPlanId === "pro-player") {
    redirect("/onboarding/player/apply");
  }
  if (activeSubPlanId === "pro-agency") {
    redirect("/onboarding/manager/info");
  }
  if (activeSubPlanId === "pro-coach") {
    redirect("/onboarding/coach/apply");
  }

  // Check for pending multi-manager agency invites
  if (user.email) {
    const pendingInvite = await db.query.agencyInvites.findFirst({
      where: (inv, { eq, and }) =>
        and(eq(inv.email, user.email!), eq(inv.status, "pending")),
    });

    if (pendingInvite) {
      // 1. Auto-assign the user to the agency
      await db.update(userProfiles)
        .set({ role: "manager", agencyId: pendingInvite.agencyId })
        .where(eq(userProfiles.userId, user.id));
      
      // 2. Mark invite as accepted
      await db.update(agencyInvites)
        .set({ status: "accepted" })
        .where(eq(agencyInvites.id, pendingInvite.id));
        
      // 3. Create the empty manager profile
      const emailPrefix = user.email.split("@")[0];
      await db.insert(managerProfiles).values({
        userId: user.id,
        fullName: emailPrefix, // Will be updated by them in the dashboard
        contactEmail: user.email,
      });
        
      redirect("/dashboard");
    }
  }

  const dashboardState = await fetchDashboardState(supabase, user.id);
  const profile = dashboardState.profile;
  const application = dashboardState.application;
  
  const { data: managerApp } = await supabase
    .from("manager_applications")
    .select("status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const applicationStatus = normalizeApplicationStatus(application?.status ?? null);

  if (profile || isApplicationApproved(applicationStatus) || managerApp?.status === "approved") {
    redirect("/dashboard");
  }

  if (isApplicationDraft(applicationStatus)) {
    redirect("/onboarding/player/apply");
  }

  const t = await getTranslations("onboarding");

  if (hasActiveApplication(applicationStatus) || managerApp?.status === "pending") {
    return (
      <main className="mx-auto max-w-xl space-y-6 p-8">
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-bh-pill border border-[rgba(0,194,255,0.22)] bg-[rgba(0,194,255,0.08)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-blue">
            {t("start.review.badge")}
          </span>
          <h1 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
            {t("start.review.title")} <span className="text-bh-lime">{t("start.review.titleHighlight")}</span>
          </h1>
          <p className="text-sm leading-[1.6] text-bh-fg-3">
            {t("start.review.description")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {managerApp?.status === "pending" ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-bh-md bg-bh-lime px-5 py-2.5 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
            >
              {t("start.review.viewPanel")}
            </Link>
          ) : (
            <Link
              href="/onboarding/player/apply"
              className="inline-flex items-center gap-2 rounded-bh-md bg-bh-lime px-5 py-2.5 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
            >
              {t("start.review.viewApplication")}
            </Link>
          )}
          <Link
            href="/dashboard"
            className="text-[13px] text-bh-fg-3 underline-offset-4 transition-colors hover:text-bh-fg-1 hover:underline"
          >
            {t("start.review.backToDashboard")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl space-y-7 p-8">
      <div className="space-y-2">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
          {t("start.chooser.badge")}
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          {t("start.chooser.title")} <span className="text-bh-lime">{t("start.chooser.titleHighlight")}</span>
        </h1>
        <p className="text-sm leading-[1.6] text-bh-fg-3">
          {t("start.chooser.subtitle")}
        </p>
      </div>

      <div className="grid gap-3">
        <Link
          href="/pricing?audience=player"
          className="bh-card-lift group flex items-center justify-between gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 px-5 py-4 transition-colors"
        >
          <div className="space-y-0.5">
            <div className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1 group-hover:text-bh-lime transition-colors">
              {t("start.chooser.player.title")}
            </div>
            <div className="text-xs text-bh-fg-3">
              {t("start.chooser.player.description")}
            </div>
          </div>
          <span className="text-bh-fg-3 transition-colors group-hover:text-bh-lime">
            →
          </span>
        </Link>
        <Link
          href="/pricing?audience=agency"
          className="bh-card-lift group flex items-center justify-between gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 px-5 py-4 transition-colors"
        >
          <div className="space-y-0.5">
            <div className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1 group-hover:text-bh-blue transition-colors">
              {t("start.chooser.agency.title")}
            </div>
            <div className="text-xs text-bh-fg-3">
              {t("start.chooser.agency.description")}
            </div>
          </div>
          <span className="text-bh-fg-3 transition-colors group-hover:text-bh-blue">
            →
          </span>
        </Link>
        <Link
          href="/onboarding/coach/apply"
          className="bh-card-lift group flex items-center justify-between gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 px-5 py-4 transition-colors"
        >
          <div className="space-y-0.5">
            <div className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1 group-hover:text-bh-lime transition-colors">
              {t("start.chooser.coach.title")}
            </div>
            <div className="text-xs text-bh-fg-3">
              {t("start.chooser.coach.description")}
            </div>
          </div>
          <span className="text-bh-fg-3 transition-colors group-hover:text-bh-lime">
            →
          </span>
        </Link>
      </div>

      <div className="pt-2">
        <Link
          href="/dashboard"
          className="text-[13px] text-bh-fg-3 underline-offset-4 transition-colors hover:text-bh-fg-1 hover:underline"
        >
          {t("start.chooser.later")}
        </Link>
      </div>
    </main>
  );
}
