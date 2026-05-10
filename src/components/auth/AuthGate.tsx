import type { User } from "@supabase/supabase-js";

import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";
import UserMenu from "./UserMenu";
import InOutButtons from "./InOutButtons";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolveOnboardingHref } from "@/lib/dashboard/onboarding-href";
import { db } from "@/lib/db";

// AuthGate renders inside the (site) layout shell on every request. We
// MUST NOT 500 the whole layout when the auth backend or DB is briefly
// unreachable (Supabase paused, pooler outage, network blip) — that would
// take down /pricing, /about, /checkout, etc. with it.
//
// Two layers of defence:
//   1. Wrap the auth check itself. If `supabase.auth.getUser()` throws
//      (rare, but observed during pooler resets), treat as anonymous.
//   2. Wrap the post-auth fetches. If any of them throw, render a minimal
//      UserMenu using only the data we already have on `user`.
//
// The success path is unchanged.

export default async function AuthGate() {
  let user: User | null = null;
  try {
    const supabase = await createSupabaseServerRSC();
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  } catch (err) {
    console.warn(
      "[AuthGate] auth check failed, treating as anonymous:",
      err instanceof Error ? err.message : err,
    );
    user = null;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <InOutButtons />
      </div>
    );
  }

  try {
    const supabase = await createSupabaseServerRSC();
    const dashboardState = await fetchDashboardState(supabase, user.id);
    const profile = dashboardState.profile;
    const application = dashboardState.application;

    // Multi-role fetch
    const up = await db.query.userProfiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.userId, user.id),
      with: { agency: true },
    });
    const role = up?.role || "member";

    const { data: managerApp } = await supabase
      .from("manager_applications")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isManager = role === "manager" || !!managerApp;

    const displayName =
      isManager && up?.agency?.name ? up.agency.name :
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "Mi cuenta";

    const handle = isManager && up?.agency?.slug
      ? `@${up.agency.slug}`
      : profile?.slug ? `@${profile.slug}` : null;

    const hasPublicProfile =
      !!profile && profile.visibility === "public" && profile.status === "approved";

    return (
      <UserMenu
        displayName={displayName}
        email={user.email ?? ""}
        handle={handle}
        avatarUrl={isManager && up?.agency?.logoUrl ? up.agency.logoUrl : (profile?.avatar_url ?? dashboardState.primaryPhotoUrl ?? null)}
        role={isManager ? "manager" : "player"}
        agencySlug={up?.agency?.slug}
        managerApplicationStatus={managerApp?.status}
        hasPlayerProfile={hasPublicProfile}
        playerSlug={profile?.slug ?? null}
        applicationStatus={application?.status ?? null}
        onboardingHref={resolveOnboardingHref(dashboardState.subscription?.planId ?? null)}
        onSignOut={signOutAction}
      />
    );
  } catch (err) {
    console.warn(
      "[AuthGate] post-auth data fetch failed, falling back to minimal menu:",
      err instanceof Error ? err.message : err,
    );

    const fallbackName =
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "Mi cuenta";

    return (
      <UserMenu
        displayName={fallbackName}
        email={user.email ?? ""}
        handle={null}
        avatarUrl={null}
        role="player"
        agencySlug={undefined}
        managerApplicationStatus={undefined}
        hasPlayerProfile={false}
        playerSlug={null}
        applicationStatus={null}
        onboardingHref="/onboarding/start"
        onSignOut={signOutAction}
      />
    );
  }
}
