import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import AvatarUploader from "@/components/dashboard/AvatarUploader";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/dashboard/profile");

  const { data: p } = await supabase.from("player_profiles")
    .select("id,avatar_url,full_name")
    .eq("user_id", user.id).maybeSingle();

  if (!p) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <p className="text-neutral-300">Todavía no tenés un perfil de jugador. <a className="underline" href="/onboarding/start">Crear</a></p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Perfil — Avatar</h1>
      <div className="flex items-center gap-4">
        <img src={p.avatar_url ?? "/images/player-default.png"} alt="avatar" className="size-20 rounded-lg object-cover ring-1 ring-neutral-800" />
        <AvatarUploader playerId={p.id} />
      </div>
    </main>
  );
}
