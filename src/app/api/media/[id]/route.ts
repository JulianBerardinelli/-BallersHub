import { NextResponse } from "next/server";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

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

    // Get Player Profile ID to verify ownership
    const { data: profile } = await supabase
      .from("player_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Player profile not found" }, { status: 404 });
    }

    // Fetch the media record
    const { data: mediaRecord, error: fetchError } = await supabase
      .from("player_media")
      .select("*")
      .eq("id", id)
      .eq("player_id", profile.id)
      .single();

    if (fetchError || !mediaRecord) {
      return NextResponse.json({ error: "Media not found or unauthorized" }, { status: 404 });
    }

    // Attempt to delete from Supabase Storage if it's a locally stored file
    // Typically, locally stored files won't have a 'provider' (like youtube)
    if (!mediaRecord.provider && mediaRecord.type === "photo" && mediaRecord.url.includes("/storage/v1/object/public/player-media/")) {
      try {
        const urlParts = mediaRecord.url.split("/storage/v1/object/public/player-media/");
        if (urlParts.length === 2) {
          const filePath = urlParts[1];
          await supabase.storage.from("player-media").remove([filePath]);
        }
      } catch (storageError) {
        console.error("Storage deletion error (non-fatal):", storageError);
      }
    }

    // Delete record from Database
    const { error: deleteError } = await supabase
      .from("player_media")
      .delete()
      .eq("id", id)
      .eq("player_id", profile.id);

    if (deleteError) {
      console.error("Database deletion error:", deleteError);
      return NextResponse.json({ error: "Failed to delete from database" }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("Media deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
