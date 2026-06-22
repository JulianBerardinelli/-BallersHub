import { NextResponse } from "next/server";
import sharp from "sharp";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";

// Avatar + hero (Pro asset) upload for the coach vertical. These are profile
// columns on coach_profiles (avatar_url / hero_url), NOT coach_media gallery
// rows, so they do not count against the multimedia quota and they publish
// immediately (no pre-moderation — they're the coach's own identity).
//
//   • avatar → square, transcoded to AVIF, used in the nav / Free hero / cards.
//   • hero   → the Pro "asset" (transparent cutout). Transcoded to AVIF, which
//              preserves alpha, and shown as the cutout in the Pro hero.
//
// Uses the RLS-bound session client: the owner can update their own
// coach_profiles row + write to the coach-media bucket (same path the gallery
// upload uses), so no service-role is needed.

const ACCEPTED_IMAGE_MIME = new Set([
  "image/avif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const AVIF_QUALITY = 70;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerRSC();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: coach } = await supabase
      .from("coach_profiles")
      .select("id, slug")
      .eq("user_id", user.id)
      .single<{ id: string; slug: string | null }>();
    if (!coach) return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const assetType = formData.get("assetType") as "avatar" | "hero" | null;

    if (assetType !== "avatar" && assetType !== "hero") {
      return NextResponse.json({ error: "assetType inválido." }, { status: 400 });
    }
    if (!file) return NextResponse.json({ error: "Adjuntá una imagen." }, { status: 400 });
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "La imagen supera el límite de 8MB." }, { status: 400 });
    }
    const mimeType = file.type.toLowerCase();
    if (!ACCEPTED_IMAGE_MIME.has(mimeType)) {
      return NextResponse.json(
        { error: "Formato no soportado. Subí JPG, PNG, WebP o AVIF." },
        { status: 400 },
      );
    }

    // Transcode to AVIF (preserves alpha for hero cutouts). Avatar is squared +
    // capped to 640px; hero keeps its aspect, capped to 1600px on the long edge.
    let uploadBuffer: Buffer;
    try {
      const input = Buffer.from(await file.arrayBuffer());
      const pipeline = sharp(input).rotate();
      if (assetType === "avatar") {
        pipeline.resize(640, 640, { fit: "cover", position: "attention" });
      } else {
        pipeline.resize(1600, 1600, { fit: "inside", withoutEnlargement: true });
      }
      uploadBuffer = await pipeline.avif({ quality: AVIF_QUALITY, effort: 4 }).toBuffer();
    } catch (transcodeError) {
      console.error("AVIF transcode error:", transcodeError);
      return NextResponse.json(
        { error: "No se pudo procesar la imagen. Probá con otro archivo." },
        { status: 400 },
      );
    }

    // Stable key per coach + asset (upsert) with a cache-busting query param on
    // the returned URL so the new image shows immediately despite the CDN cache.
    const fileName = `profile/${user.id}/${assetType}.avif`;
    const { error: uploadError } = await supabase.storage
      .from("coach-media")
      .upload(fileName, uploadBuffer, {
        contentType: "image/avif",
        cacheControl: "3600",
        upsert: true,
      });
    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "No se pudo subir el archivo." }, { status: 500 });
    }
    const { data: urlData } = supabase.storage.from("coach-media").getPublicUrl(fileName);
    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    const column = assetType === "avatar" ? "avatar_url" : "hero_url";
    const { error: updateError } = await supabase
      .from("coach_profiles")
      .update({ [column]: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", coach.id);
    if (updateError) {
      console.error("coach_profiles update error:", updateError);
      return NextResponse.json({ error: "No se pudo guardar la imagen en tu perfil." }, { status: 500 });
    }

    revalidateCoachPublicProfile(coach.slug);
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error("Coach profile image upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
