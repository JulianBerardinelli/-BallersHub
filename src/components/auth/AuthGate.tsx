
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";
import UserMenu from "./UserMenu";
import InOutButtons from "./InOutButtons";

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

  // Player profile vinculado (si existe)
// ⬇️ Traemos también visibility y status para decidir si el perfil es “público & aprobado”
  const { data: profile } = await supabase
    .from("player_profiles")
    .select("slug, avatar_url, visibility, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Mi cuenta";

  // Si tenés un handle (@slug) lo mostramos, si no el email
  const handle = profile?.slug ? `@${profile.slug}` : null;

  const hasPublicProfile =
    !!profile && profile.visibility === "public" && profile.status === "approved";

  return (
    <UserMenu
      displayName={displayName}
      email={user.email ?? ""}
      handle={handle}
      avatarUrl={profile?.avatar_url ?? null}
      hasPlayerProfile={hasPublicProfile} 
      playerSlug={profile?.slug ?? null}
      onSignOut={signOutAction}
    />
  );
}
