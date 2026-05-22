import { NextResponse } from "next/server";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { revalidatePlayerPublicProfile } from "@/lib/seo/revalidate";

type MediaPatchBody = {
  title?: string | null;
  altText?: string | null;
  // Tags as comma-separated string OR JSON array. Empty/whitespace = NULL
  // (clear tags).
  tags?: string | string[] | null;
  seasonYear?: number | string | null;
  isPrimary?: boolean;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    // Ownership check + fetch the row so we know its `type` (season_year is
    // only meaningful for videos).
    const { data: mediaRecord } = await supabase
      .from("player_media")
      .select("id, type, is_primary")
      .eq("id", id)
      .eq("player_id", profile.id)
      .single<{ id: string; type: "photo" | "video"; is_primary: boolean }>();
    if (!mediaRecord) {
      return NextResponse.json({ error: "Media not found or unauthorized" }, { status: 404 });
    }

    let body: MediaPatchBody;
    try {
      body = (await req.json()) as MediaPatchBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const t = typeof body.title === "string" ? body.title.trim() : "";
      updatePayload.title = t.length > 0 ? t : null;
    }

    if (body.altText !== undefined) {
      const a = typeof body.altText === "string" ? body.altText.trim() : "";
      updatePayload.alt_text = a.length > 0 ? a : null;
    }

    if (body.tags !== undefined) {
      let tagsArr: string[] | null = null;
      if (Array.isArray(body.tags)) {
        tagsArr = body.tags.map((t) => String(t).trim()).filter((t) => t.length > 0);
      } else if (typeof body.tags === "string") {
        tagsArr = body.tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
      }
      updatePayload.tags = tagsArr && tagsArr.length > 0 ? tagsArr : null;
    }

    if (body.seasonYear !== undefined) {
      // season_year only stored on videos; ignore silently for photos.
      if (mediaRecord.type === "video") {
        if (body.seasonYear === null || body.seasonYear === "") {
          updatePayload.season_year = null;
        } else {
          const parsed = typeof body.seasonYear === "number"
            ? body.seasonYear
            : parseInt(String(body.seasonYear).trim(), 10);
          if (!Number.isFinite(parsed) || parsed < 1900 || parsed > 2100) {
            return NextResponse.json(
              { error: "El año de la temporada debe estar entre 1900 y 2100." },
              { status: 400 },
            );
          }
          updatePayload.season_year = parsed;
        }
      }
    }

    if (body.isPrimary !== undefined && mediaRecord.type === "photo") {
      updatePayload.is_primary = Boolean(body.isPrimary);
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ success: true, data: null, noop: true });
    }

    const { data: updated, error: updateError } = await supabase
      .from("player_media")
      .update(updatePayload)
      .eq("id", id)
      .eq("player_id", profile.id)
      .select()
      .single();

    if (updateError) {
      console.error("Media update error:", updateError);
      return NextResponse.json({ error: "Failed to update media" }, { status: 500 });
    }

    revalidatePlayerPublicProfile(profile.slug ?? null);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Media patch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
