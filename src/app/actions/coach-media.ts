"use server";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";
import { revalidatePath } from "next/cache";

export type CoachMediaActionResult = { success: boolean; message?: string };

const BUCKET = "coach-media";

// Extracts the in-bucket object path from a public Supabase storage URL, or
// null if the URL isn't one of our coach-media objects (e.g. a YouTube link).
function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const path = url.slice(idx + marker.length);
  return path.length > 0 ? decodeURIComponent(path) : null;
}

export async function deleteCoachMedia(id: string): Promise<CoachMediaActionResult> {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado." };

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select("id, slug")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; slug: string | null }>();
  if (!coach) return { success: false, message: "No tenés un perfil de entrenador." };

  // Read the row first (RLS-scoped) so we know the storage object to clean up.
  const { data: row } = await supabase
    .from("coach_media")
    .select("id, url")
    .eq("id", id)
    .eq("coach_id", coach.id)
    .maybeSingle<{ id: string; url: string }>();
  if (!row) return { success: false, message: "No se encontró el archivo." };

  const { error } = await supabase
    .from("coach_media")
    .delete()
    .eq("id", id)
    .eq("coach_id", coach.id);
  if (error) return { success: false, message: error.message };

  // Best-effort storage cleanup for uploaded files (skips external links).
  const path = storagePathFromPublicUrl(row.url);
  if (path) {
    await supabase.storage.from(BUCKET).remove([path]);
  }

  revalidateCoachPublicProfile(coach.slug);
  revalidatePath("/dashboard/coach/multimedia");
  return { success: true };
}
