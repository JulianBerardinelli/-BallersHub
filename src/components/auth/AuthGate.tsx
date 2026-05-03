
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";
import UserMenu from "./UserMenu";
import InOutButtons from "./InOutButtons";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { db } from "@/lib/db";

export default async function AuthGate() {
  const supabase = await createSupabaseServerRSC();

  // Sesión
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <InOutButtons />
      </div>
    );
  }

  // Defensive: any of the post-auth fetches below can fail when the DB
  // backend is unreachable (Supabase paused, network blip, pooler outage).
  // We don't want a transient backend issue to 500 the entire site shell —
  // marketing pages would become unreachable. On failure we degrade to a
  // minimal UserMenu using only data we already have from the auth session.
  try {
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

    // Si tenés un handle (@slug) lo mostramos, si no el email
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

        onSignOut={signOutAction}
      />
    );
  } catch (err) {
    console.warn(
      "[AuthGate] post-auth data fetch failed, falling back to minimal menu:",
      err,
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
        onSignOut={signOutAction}
      />
    );
  }
}
