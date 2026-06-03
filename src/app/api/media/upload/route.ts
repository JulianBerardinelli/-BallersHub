import { NextResponse } from "next/server";
import sharp from "sharp";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { revalidatePlayerPublicProfile } from "@/lib/seo/revalidate";
import { PRO_PHOTO_CAP, isFounderEmail } from "@/lib/dashboard/founder-emails";
import { isCatalogPhoto } from "@/lib/dashboard/catalog-photos";

// Accepted MIME types for catalog photo uploads. AVIF is accepted as-is
// (already optimized); other rasters are transcoded to AVIF server-side.
const ACCEPTED_IMAGE_MIME = new Set([
  "image/avif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

// Sharp AVIF quality. 60 is a good "visually lossless for portraits"
// preset — AVIF at q60 typically beats JPEG q85 in both size and quality.
const AVIF_QUALITY = 60;

/**
 * Compose a meaningful default alt-text for a media item when the
 * uploader didn't supply one. Pricing matrix §E item #5 — Pro pages
 * need optimized alt-tags on every image for accessibility + Google
 * Images SEO, but we can't gate on the player remembering to fill it.
 *
 * Pattern: `{Player full name} — {positions joined} · {current club}`.
 * Falls back to just `{fullName}` when fields are missing. Always
 * returns a non-empty string so the column never holds an empty alt.
 */
function buildDefaultAltText(profile: {
  full_name: string | null;
  positions: string[] | null;
  current_club: string | null;
}): string {
  const name = profile.full_name?.trim() || "Futbolista";
  const segments: string[] = [name];
  if (profile.positions && profile.positions.length > 0) {
    segments.push(profile.positions.slice(0, 2).join(" / "));
  }
  if (profile.current_club && profile.current_club.trim().length > 0) {
    segments.push(profile.current_club.trim());
  }
  return segments.join(" — ");
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerRSC();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Player Profile (id + slug + alt-text composition fields + avatar_url).
    // `avatar_url` is needed to discount the avatar row when counting
    // existing catalog photos against `PRO_PHOTO_CAP`.
    const { data: profile } = await supabase
      .from("player_profiles")
      .select("id, slug, full_name, positions, current_club, avatar_url")
      .eq("user_id", user.id)
      .single<{
        id: string;
        slug: string | null;
        full_name: string | null;
        positions: string[] | null;
        current_club: string | null;
        avatar_url: string | null;
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

    // Parse season_year. Only meaningful for type=video; ignored otherwise.
    // Sanity bounds: 1900–2100 (catches typos like 20245 / "abc"). NULL when
    // not provided or invalid so the column stays nullable for legacy rows.
    let seasonYear: number | null = null;
    if (type === "video" && rawSeasonYear && rawSeasonYear.trim()) {
      const parsed = parseInt(rawSeasonYear.trim(), 10);
      if (Number.isFinite(parsed) && parsed >= 1900 && parsed <= 2100) {
        seasonYear = parsed;
      }
    }

    // Server-default alt-text: when the form omits/empties altText,
    // synthesize one from the player's name + position + current club.
    // This satisfies pricing matrix §E #5 (optimized alt-tags on
    // multimedia) without requiring the player to fill the field.
    const altText =
      rawAltText && rawAltText.trim().length > 0
        ? rawAltText.trim()
        : buildDefaultAltText(profile);
    
    // Parse tags array
    let tags: string[] | null = null;
    if (tagsString) {
      try {
        tags = JSON.parse(tagsString);
      } catch {
        tags = tagsString.split(",").map(t => t.trim()).filter(Boolean);
      }
    }

    if (!type) {
      return NextResponse.json({ error: "Media type is required" }, { status: 400 });
    }

    // Catalog photo cap (`PRO_PHOTO_CAP` = 5). Founder accounts listed in
    // FOUNDER_EMAILS are exempt — they can upload unlimited photos.
    // Counting uses isCatalogPhoto, which excludes the avatar row and any
    // pro_asset_* rows so the dashboard counter matches the public
    // /[slug] gallery (which also caps at 5).
    if (type === "photo" && !isFounderEmail(user.email)) {
      const { data: existingPhotos } = await supabase
        .from("player_media")
        .select("id, type, provider, url")
        .eq("player_id", profile.id)
        .eq("type", "photo");

      const catalogCount = (existingPhotos ?? []).filter((row) =>
        isCatalogPhoto(row, profile.avatar_url),
      ).length;

      if (catalogCount >= PRO_PHOTO_CAP) {
        return NextResponse.json(
          {
            error: `Llegaste al límite de ${PRO_PHOTO_CAP} fotos del catálogo. Eliminá alguna existente para subir una nueva.`,
          },
          { status: 403 },
        );
      }
    }

    let publicUrl = url || "";

    // Upload local file if provided
    if (file && !url) {
      // Validate file size (5MB for images pre-transcode; AVIF output is
      // smaller). Video file uploads stay Pro-only.
      const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

      if (type === "photo" && file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: "Image size exceeds 5MB limit" }, { status: 400 });
      }
      if (type === "video") {
        return NextResponse.json({ error: "La subida de archivos de video está reservada para usuarios Pro. Por favor, utiliza un link de YouTube o Vimeo." }, { status: 403 });
      }

      const mimeType = file.type.toLowerCase();
      if (type === "photo" && !ACCEPTED_IMAGE_MIME.has(mimeType)) {
        return NextResponse.json(
          { error: "Formato no soportado. Subí JPG, PNG, WebP o AVIF." },
          { status: 400 },
        );
      }

      // Transcode JPG/PNG/WebP to AVIF for catalog storage savings + faster
      // public renders. Already-AVIF files pass through untouched.
      let uploadBuffer: Buffer;
      let uploadContentType: string;
      if (mimeType === "image/avif") {
        uploadBuffer = Buffer.from(await file.arrayBuffer());
        uploadContentType = "image/avif";
      } else {
        try {
          const input = Buffer.from(await file.arrayBuffer());
          uploadBuffer = await sharp(input)
            .rotate() // honor EXIF orientation before re-encoding
            .avif({ quality: AVIF_QUALITY, effort: 4 })
            .toBuffer();
          uploadContentType = "image/avif";
        } catch (transcodeError) {
          console.error("AVIF transcode error:", transcodeError);
          return NextResponse.json(
            { error: "No se pudo procesar la imagen. Probá con otro archivo." },
            { status: 400 },
          );
        }
      }

      // Always store with .avif extension since the bytes are always AVIF
      // after the branch above.
      const fileName = `gallery/${user.id}/${crypto.randomUUID()}.avif`;

      const { error: uploadError } = await supabase.storage
        .from("player-media")
        .upload(fileName, uploadBuffer, {
          contentType: uploadContentType,
          cacheControl: "31536000",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from("player-media").getPublicUrl(fileName);
      publicUrl = urlData.publicUrl;
    }

    if (!publicUrl) {
      return NextResponse.json({ error: "File or external URL is required" }, { status: 400 });
    }

    // Append new videos at the end of the player's manual ordering. Photos
    // are never reordered, so they stay at position 0 and keep sorting by
    // createdAt (newest first) everywhere they're listed.
    let nextPosition = 0;
    if (type === "video") {
      const { data: maxRow } = await supabase
        .from("player_media")
        .select("position")
        .eq("player_id", profile.id)
        .eq("type", "video")
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle<{ position: number }>();
      nextPosition = (maxRow?.position ?? -1) + 1;
    }

    // Insert record
    const { data: mediaRecord, error: insertError } = await supabase
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
        is_approved: true, // Reactive mode
        is_flagged: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return NextResponse.json({ error: "Failed to save media record in database" }, { status: 500 });
    }

    // New approved media means the public gallery and OG image
    // (which can use the new avatar / hero) must re-render. Bust the
    // 1h ISR window so the player sees their upload immediately on
    // their public profile.
    revalidatePlayerPublicProfile(profile.slug ?? null);

    return NextResponse.json({ success: true, data: mediaRecord });
  } catch (error: any) {
    console.error("Media upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
