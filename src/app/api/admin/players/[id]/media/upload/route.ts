import { NextResponse } from "next/server";

import { ensureAdminActor } from "@/lib/admin/auth";
import { recordAdminPlayerAudit } from "@/lib/admin/notify";
import { revalidatePlayerPublicProfileById } from "@/lib/seo/revalidate";
import { buildDefaultAltText, transcodeImageToAvif } from "@/lib/media/process-image";

// Admin upload of a catalog photo / video link to ANOTHER player's media.
// Mirrors /api/media/upload but: admin-gated, keyed by the URL playerId, and
// written with the service-role client. Pro/Free gating is enforced in the UI
// (the reused MultimediaManagerClient runs in videoOnly for Free players).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: playerId } = await ctx.params;

    const auth = await ensureAdminActor();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });
    const admin = auth.actor.adminClient;

    const { data: profile } = await admin
      .from("player_profiles")
      .select("id, user_id, slug, full_name, positions, current_club")
      .eq("id", playerId)
      .maybeSingle<{
        id: string;
        user_id: string;
        slug: string | null;
        full_name: string | null;
        positions: string[] | null;
        current_club: string | null;
      }>();
    if (!profile) {
      return NextResponse.json({ error: "Player profile not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const url = formData.get("url") as string | null;
    const type = formData.get("type") as "photo" | "video";
    const title = formData.get("title") as string | null;
    const provider = formData.get("provider") as string | null;
    const isPrimary = formData.get("isPrimary") === "true";
    const rawAltText = formData.get("altText") as string | null;
    const tagsString = formData.get("tags") as string | null;
    const rawSeasonYear = formData.get("seasonYear") as string | null;

    if (!type) {
      return NextResponse.json({ error: "Media type is required" }, { status: 400 });
    }

    let seasonYear: number | null = null;
    if (type === "video" && rawSeasonYear && rawSeasonYear.trim()) {
      const parsed = parseInt(rawSeasonYear.trim(), 10);
      if (Number.isFinite(parsed) && parsed >= 1900 && parsed <= 2100) seasonYear = parsed;
    }

    const altText =
      rawAltText && rawAltText.trim().length > 0 ? rawAltText.trim() : buildDefaultAltText(profile);

    let tags: string[] | null = null;
    if (tagsString) {
      try {
        tags = JSON.parse(tagsString);
      } catch {
        tags = tagsString.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    let publicUrl = url || "";

    if (file && !url) {
      const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
      if (type === "photo" && file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: "Image size exceeds 5MB limit" }, { status: 400 });
      }
      if (type === "video") {
        return NextResponse.json(
          { error: "La subida de archivos de video no está disponible. Usá un link de YouTube o Vimeo." },
          { status: 400 },
        );
      }

      const processed = await transcodeImageToAvif(file);
      if ("error" in processed) {
        return NextResponse.json({ error: processed.error }, { status: 400 });
      }

      const fileName = `gallery/${profile.user_id}/${crypto.randomUUID()}.avif`;
      const { error: uploadError } = await admin.storage
        .from("player-media")
        .upload(fileName, processed.buffer, {
          contentType: processed.contentType,
          cacheControl: "31536000",
          upsert: false,
        });
      if (uploadError) {
        console.error("[admin media] storage upload error:", uploadError);
        return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
      }
      const { data: urlData } = admin.storage.from("player-media").getPublicUrl(fileName);
      publicUrl = urlData.publicUrl;
    }

    if (!publicUrl) {
      return NextResponse.json({ error: "File or external URL is required" }, { status: 400 });
    }

    let nextPosition = 0;
    if (type === "video") {
      const { data: maxRow } = await admin
        .from("player_media")
        .select("position")
        .eq("player_id", profile.id)
        .eq("type", "video")
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle<{ position: number }>();
      nextPosition = (maxRow?.position ?? -1) + 1;
    }

    const { data: mediaRecord, error: insertError } = await admin
      .from("player_media")
      .insert({
        player_id: profile.id,
        type,
        url: publicUrl,
        title,
        alt_text: altText,
        tags,
        provider,
        season_year: seasonYear,
        position: nextPosition,
        is_primary: isPrimary,
        is_approved: true,
        is_flagged: false,
      })
      .select()
      .single();
    if (insertError) {
      console.error("[admin media] insert error:", insertError);
      return NextResponse.json({ error: "Failed to save media record" }, { status: 500 });
    }

    await recordAdminPlayerAudit({
      actorId: auth.actor.actorId,
      actorIp: auth.actor.actorIp,
      playerId: profile.id,
      targetUserId: profile.user_id,
      domain: "multimedia",
      action: "media.upload",
    });
    await revalidatePlayerPublicProfileById(admin, profile.id);

    return NextResponse.json({ success: true, data: mediaRecord });
  } catch (error) {
    console.error("[admin media] upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
