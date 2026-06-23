import { NextResponse } from "next/server";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { revalidatePlayerPublicProfile } from "@/lib/seo/revalidate";

// DELETE de una foto del bloque Selección Nacional (tabla national_team_media).
// Espeja /api/media/[id] pero acotado a national_team_media + bucket path
// national-team/. Scopeado al dueño (player_id).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Media ID is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerRSC();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("player_profiles")
      .select("id, slug")
      .eq("user_id", user.id)
      .single<{ id: string; slug: string | null }>();

    if (!profile) {
      return NextResponse.json({ error: "Player profile not found" }, { status: 404 });
    }

    const { data: mediaRecord, error: fetchError } = await supabase
      .from("national_team_media")
      .select("id, url")
      .eq("id", id)
      .eq("player_id", profile.id)
      .single<{ id: string; url: string }>();

    if (fetchError || !mediaRecord) {
      return NextResponse.json({ error: "Media not found or unauthorized" }, { status: 404 });
    }

    // Best-effort: borrar el objeto del storage.
    if (mediaRecord.url.includes("/storage/v1/object/public/player-media/")) {
      try {
        const urlParts = mediaRecord.url.split("/storage/v1/object/public/player-media/");
        if (urlParts.length === 2) {
          await supabase.storage.from("player-media").remove([urlParts[1]]);
        }
      } catch (storageError) {
        console.error("Storage deletion error (non-fatal):", storageError);
      }
    }

    const { error: deleteError } = await supabase
      .from("national_team_media")
      .delete()
      .eq("id", id)
      .eq("player_id", profile.id);

    if (deleteError) {
      console.error("Database deletion error:", deleteError);
      return NextResponse.json({ error: "Failed to delete from database" }, { status: 500 });
    }

    revalidatePlayerPublicProfile(profile.slug ?? null);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("National team media deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
