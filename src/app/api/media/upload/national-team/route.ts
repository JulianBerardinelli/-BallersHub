import { NextResponse } from "next/server";
import sharp from "sharp";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { revalidatePlayerPublicProfile } from "@/lib/seo/revalidate";
import { NT_PHOTO_CAP } from "@/lib/dashboard/national-team";

// Subida de fotos del bloque "Selección Nacional". Espeja /api/media/upload
// pero guarda en la tabla APARTE `national_team_media` (cap de 4 TOTALES por
// jugador, no por etapa) — por eso NO cuenta contra el PRO_PHOTO_CAP (5) de la
// galería normal. Mismo bucket `player-media`, path national-team/{user}/…
//
// Las fotos nacen `is_approved=false`: el dueño las ve en su dashboard (RLS
// owner-read) pero no son públicas hasta que el admin las valida — es parte de
// una credencial sensible.

const ACCEPTED_IMAGE_MIME = new Set([
  "image/avif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const AVIF_QUALITY = 60;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function buildDefaultAltText(profile: {
  full_name: string | null;
}): string {
  const name = profile.full_name?.trim() || "Futbolista";
  return `${name} — Selección Nacional`;
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

    const { data: profile } = await supabase
      .from("player_profiles")
      .select("id, slug, full_name")
      .eq("user_id", user.id)
      .single<{ id: string; slug: string | null; full_name: string | null }>();

    if (!profile) {
      return NextResponse.json({ error: "Player profile not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawAltText = formData.get("altText") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Cap de fotos del bloque selección (4 TOTAL por jugador). Sin exención de
    // founders: es un bloque acotado por diseño (es un único bloque visual).
    const { count: existingCount } = await supabase
      .from("national_team_media")
      .select("id", { count: "exact", head: true })
      .eq("player_id", profile.id);

    if ((existingCount ?? 0) >= NT_PHOTO_CAP) {
      return NextResponse.json(
        {
          error: `Llegaste al límite de ${NT_PHOTO_CAP} fotos del bloque Selección Nacional. Eliminá alguna para subir otra.`,
        },
        { status: 403 },
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Image size exceeds 5MB limit" }, { status: 400 });
    }

    const mimeType = file.type.toLowerCase();
    if (!ACCEPTED_IMAGE_MIME.has(mimeType)) {
      return NextResponse.json(
        { error: "Formato no soportado. Subí JPG, PNG, WebP o AVIF." },
        { status: 400 },
      );
    }

    // Transcode a AVIF (los AVIF ya optimizados pasan tal cual).
    let uploadBuffer: Buffer;
    if (mimeType === "image/avif") {
      uploadBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      try {
        const input = Buffer.from(await file.arrayBuffer());
        uploadBuffer = await sharp(input)
          .rotate() // honor EXIF orientation before re-encoding
          .avif({ quality: AVIF_QUALITY, effort: 4 })
          .toBuffer();
      } catch (transcodeError) {
        console.error("AVIF transcode error:", transcodeError);
        return NextResponse.json(
          { error: "No se pudo procesar la imagen. Probá con otro archivo." },
          { status: 400 },
        );
      }
    }

    const fileName = `national-team/${user.id}/${crypto.randomUUID()}.avif`;

    const { error: uploadError } = await supabase.storage
      .from("player-media")
      .upload(fileName, uploadBuffer, {
        contentType: "image/avif",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("player-media").getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    const altText =
      rawAltText && rawAltText.trim().length > 0
        ? rawAltText.trim()
        : buildDefaultAltText(profile);

    // Append al final del orden manual (positions 0..3).
    const { data: maxRow } = await supabase
      .from("national_team_media")
      .select("position")
      .eq("player_id", profile.id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle<{ position: number }>();
    const nextPosition = (maxRow?.position ?? -1) + 1;

    const { data: mediaRecord, error: insertError } = await supabase
      .from("national_team_media")
      .insert({
        player_id: profile.id,
        url: publicUrl,
        alt_text: altText,
        position: nextPosition,
        is_approved: false, // moderado: el admin valida antes de publicar
        is_flagged: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return NextResponse.json({ error: "Failed to save media record in database" }, { status: 500 });
    }

    revalidatePlayerPublicProfile(profile.slug ?? null);

    return NextResponse.json({ success: true, data: mediaRecord });
  } catch (error) {
    console.error("National team media upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
