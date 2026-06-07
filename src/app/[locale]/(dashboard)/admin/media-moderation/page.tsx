import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MediaModerationPanel from "./ui/MediaModerationPanel";

export default async function MediaModerationPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?redirect=/admin/media-moderation");
  }

  // Verifica Rol
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (userProfile?.role !== "admin" && userProfile?.role !== "moderator") {
    redirect("/dashboard");
  }

  // Obtenemos los medios para moderación (pendientes y un historial reciente)
  const { data: mediaData, error } = await supabase
    .from("player_media")
    .select(`
      id,
      player_id,
      type,
      url,
      provider,
      created_at,
      is_approved,
      is_flagged,
      reviewed_by,
      player:player_profiles (
        full_name,
        slug
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error cargando multimedia pendiente", error);
  }

  const mappedMedia = (mediaData || []).map((m: any) => ({
    id: m.id,
    player_id: m.player_id,
    type: m.type,
    url: m.url,
    provider: m.provider,
    created_at: m.created_at,
    is_approved: m.is_approved,
    is_flagged: m.is_flagged,
    reviewed_by: m.reviewed_by,
    player: Array.isArray(m.player) ? m.player[0] : m.player,
  }));

  return <MediaModerationPanel initialMedia={mappedMedia} />;
}
