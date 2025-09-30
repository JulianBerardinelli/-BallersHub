import type { SupabaseClient } from "@supabase/supabase-js";

export type PlayerTaskMetrics = {
  careerItems: number;
  media: {
    total: number;
    photos: number;
    videos: number;
    docs: number;
  };
  contactReferences: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export async function fetchPlayerTaskMetrics(
  supabase: AnySupabaseClient,
  playerId: string,
): Promise<PlayerTaskMetrics> {
  const [careerItemsCount, totalMediaCount, photoMediaCount, videoMediaCount, docMediaCount] = await Promise.all([
    supabase
      .from("career_items")
      .select("id", { count: "exact", head: true })
      .eq("player_id", playerId),
    supabase
      .from("player_media")
      .select("id", { count: "exact", head: true })
      .eq("player_id", playerId),
    supabase
      .from("player_media")
      .select("id", { count: "exact", head: true })
      .eq("player_id", playerId)
      .eq("type", "photo"),
    supabase
      .from("player_media")
      .select("id", { count: "exact", head: true })
      .eq("player_id", playerId)
      .eq("type", "video"),
    supabase
      .from("player_media")
      .select("id", { count: "exact", head: true })
      .eq("player_id", playerId)
      .eq("type", "doc"),
  ]);

  return {
    careerItems: careerItemsCount.count ?? 0,
    media: {
      total: totalMediaCount.count ?? 0,
      photos: photoMediaCount.count ?? 0,
      videos: videoMediaCount.count ?? 0,
      docs: docMediaCount.count ?? 0,
    },
    // TODO: reemplazar con el conteo real cuando exista la tabla de contactos/referencias
    contactReferences: 0,
  };
}
