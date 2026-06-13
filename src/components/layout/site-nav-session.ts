// Request-scoped resolution of the logged-in user + profile + plan, SHARED by
// the header menu (AuthGate) and the mobile dock (PublicDockGate). Both render
// inside the (site) layout on every request; wrapping the resolution in React
// `cache()` means the DB work runs ONCE per request instead of twice.
//
// Mirrors the data layer AuthGate used previously (supabase.auth.getUser +
// fetchDashboardState + userProfiles + manager_applications + resolvePlanAccess)
// and keeps the same hardened try/catch so a DB blip degrades gracefully rather
// than 500-ing the layout.

import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import { resolveOnboardingHref } from "@/lib/dashboard/onboarding-href";
import { db } from "@/lib/db";

export type SiteNavSession = {
  user: User;
  isManager: boolean;
  /** Display name (agency name for managers); null when truly unknown. */
  displayName: string | null;
  /** "@slug" handle. */
  handle: string | null;
  playerSlug: string | null;
  agencySlug: string | null;
  avatarUrl: string | null;
  isPro: boolean;
  /** Player has an approved + public profile (header link guard). */
  hasPlayerProfile: boolean;
  /** Public profile path: /{slug} (player) or /agency/{slug} (manager); null. */
  publicHref: string | null;
  applicationStatus: string | null;
  managerApplicationStatus: string | undefined;
  onboardingHref: string;
  /** True when the post-auth fetch failed (degraded UserMenu / guest dock). */
  degraded: boolean;
};

export const getSiteNavSession = cache(async (): Promise<SiteNavSession | null> => {
  let user: User | null = null;
  try {
    const supabase = await createSupabaseServerRSC();
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  } catch (err) {
    console.warn(
      "[getSiteNavSession] auth check failed, treating as anonymous:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }

  if (!user) return null;
  const authedUser = user;

  const fallbackName =
    (authedUser.user_metadata?.full_name as string | undefined) ??
    authedUser.email?.split("@")[0] ??
    null;

  try {
    const supabase = await createSupabaseServerRSC();
    const dashboardState = await fetchDashboardState(supabase, authedUser.id);
    const profile = dashboardState.profile;
    const application = dashboardState.application;

    const up = await db.query.userProfiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.userId, authedUser.id),
      with: { agency: true },
    });
    const role = up?.role || "member";

    const { data: managerApp } = await supabase
      .from("manager_applications")
      .select("status")
      .eq("user_id", authedUser.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isManager = role === "manager" || !!managerApp;
    const access = resolvePlanAccess(dashboardState.subscription ?? null);

    const playerSlug = profile?.slug ?? null;
    const agencySlug = up?.agency?.slug ?? null;

    const displayName = isManager && up?.agency?.name ? up.agency.name : fallbackName;

    const handle = isManager
      ? agencySlug
        ? `@${agencySlug}`
        : null
      : playerSlug
        ? `@${playerSlug}`
        : null;

    const hasPlayerProfile =
      !!profile && profile.visibility === "public" && profile.status === "approved";
    const hasPublicProfile = isManager ? !!agencySlug : hasPlayerProfile;
    const publicHref = !hasPublicProfile
      ? null
      : isManager
        ? `/agency/${agencySlug}`
        : `/${playerSlug}`;

    const avatarUrl =
      isManager && up?.agency?.logoUrl
        ? up.agency.logoUrl
        : profile?.avatar_url ?? dashboardState.primaryPhotoUrl ?? null;

    return {
      user: authedUser,
      isManager,
      displayName,
      handle,
      playerSlug,
      agencySlug,
      avatarUrl,
      isPro: access.isPro,
      hasPlayerProfile,
      publicHref,
      applicationStatus: application?.status ?? null,
      managerApplicationStatus: managerApp?.status ?? undefined,
      onboardingHref: resolveOnboardingHref(dashboardState.subscription?.planId ?? null),
      degraded: false,
    };
  } catch (err) {
    console.warn(
      "[getSiteNavSession] post-auth data fetch failed, degraded mode:",
      err instanceof Error ? err.message : err,
    );
    return {
      user: authedUser,
      isManager: false,
      displayName: fallbackName,
      handle: null,
      playerSlug: null,
      agencySlug: null,
      avatarUrl: null,
      isPro: false,
      hasPlayerProfile: false,
      publicHref: null,
      applicationStatus: null,
      managerApplicationStatus: undefined,
      onboardingHref: "/onboarding/start",
      degraded: true,
    };
  }
});
