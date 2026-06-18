import { NextResponse } from "next/server";
import sharp from "sharp";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";

// Mirrors /api/media/upload (player) but for the coach vertical: uploads to the
// `coach-media` bucket, gates via the plan-aware coach_can_add_media RPC, and
// inserts with status='pending' — coach media is PRE-moderated (hidden from the
// public portfolio until a reviewer approves it), unlike player_media which is
// reactive (is_approved default true).

const ACCEPTED_IMAGE_MIME = new Set([
  "image/avif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const AVIF_QUALITY = 60;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerRSC();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: coach } = await supabase
      .from("coach_profiles")
      .select("id, slug, full_name")
      .eq("user_id", user.id)
      .single<{ id: string; slug: string | null; full_name: string | null }>();

    if (!coach) {
      return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const url = formData.get("url") as string | null;
    const type = formData.get("type") as "photo" | "video";
    const title = (formData.get("title") as string | null)?.trim() || null;
    const provider = (formData.get("provider") as string | null)?.trim() || null;
    const rawAltText = formData.get("altText") as string | null;
    const tagsString = formData.get("tags") as string | null;
    const rawSeasonYear = formData.get("seasonYear") as string | null;

    if (type !== "photo" && type !== "video") {
      return NextResponse.json({ error: "Media type is required" }, { status: 400 });
    }

    // Plan-aware quota gate. The RPC checks ownership AND the count of existing
    // rows of this type against the coach's subscription limit.
    const { data: canAdd, error: gateError } = await supabase.rpc("coach_can_add_media", {
      p_user_id: user.id,
      p_coach_id: coach.id,
      p_type: type,
    });
    if (gateError) {
      return NextResponse.json({ error: "No se pudo validar el límite de tu plan." }, { status: 500 });
    }
    if (!canAdd) {
      const { data: maxAllowed } = await supabase.rpc("coach_max_media_allowed", {
        p_coach_id: coach.id,
        p_type: type,
      });
      const noun = type === "photo" ? "fotos" : "videos";
      return NextResponse.json(
        {
          error: `Llegaste al límite de ${maxAllowed ?? ""} ${noun} de tu plan. Eliminá alguno o mejorá tu plan para subir más.`.replace(
            "  ",
            " ",
          ),
        },
        { status: 403 },
      );
    }

    let seasonYear: number | null = null;
    if (type === "video" && rawSeasonYear && rawSeasonYear.trim()) {
      const parsed = parseInt(rawSeasonYear.trim(), 10);
      if (Number.isFinite(parsed) && parsed >= 1900 && parsed <= 2100) {
        seasonYear = parsed;
      }
    }

    const altText =
      rawAltText && rawAltText.trim().length > 0
        ? rawAltText.trim()
        : `${coach.full_name?.trim() || "Entrenador"}${title ? ` — ${title}` : ""}`;

    let tags: string[] | null = null;
    if (tagsString) {
      try {
        tags = JSON.parse(tagsString);
      } catch {
        tags = tagsString
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }

    let publicUrl = url?.trim() || "";

    if (file && !publicUrl) {
      if (type === "video") {
        return NextResponse.json(
          { error: "Subí los videos como link de YouTube o Vimeo." },
          { status: 400 },
        );
      }
      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: "La imagen supera el límite de 5MB." }, { status: 400 });
      }
      const mimeType = file.type.toLowerCase();
      if (!ACCEPTED_IMAGE_MIME.has(mimeType)) {
        return NextResponse.json(
          { error: "Formato no soportado. Subí JPG, PNG, WebP o AVIF." },
          { status: 400 },
        );
      }

      let uploadBuffer: Buffer;
      if (mimeType === "image/avif") {
        uploadBuffer = Buffer.from(await file.arrayBuffer());
      } else {
        try {
          const input = Buffer.from(await file.arrayBuffer());
          uploadBuffer = await sharp(input)
            .rotate()
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

      const fileName = `gallery/${user.id}/${crypto.randomUUID()}.avif`;
      const { error: uploadError } = await supabase.storage
        .from("coach-media")
        .upload(fileName, uploadBuffer, {
          contentType: "image/avif",
          cacheControl: "31536000",
          upsert: false,
        });
      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return NextResponse.json({ error: "No se pudo subir el archivo." }, { status: 500 });
      }
      const { data: urlData } = supabase.storage.from("coach-media").getPublicUrl(fileName);
      publicUrl = urlData.publicUrl;
    }

    if (!publicUrl) {
      return NextResponse.json({ error: "Adjuntá un archivo o un link." }, { status: 400 });
    }

    // Append new videos at the end of the manual ordering; photos stay at 0.
    let nextPosition = 0;
    if (type === "video") {
      const { data: maxRow } = await supabase
        .from("coach_media")
        .select("position")
        .eq("coach_id", coach.id)
        .eq("type", "video")
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle<{ position: number }>();
      nextPosition = (maxRow?.position ?? -1) + 1;
    }

    const { data: mediaRecord, error: insertError } = await supabase
      .from("coach_media")
      .insert({
        coach_id: coach.id,
        type,
        url: publicUrl,
        title,
        alt_text: altText,
        tags,
        provider,
        season_year: seasonYear,
        position: nextPosition,
        is_primary: false,
        // status defaults to 'pending' (pre-moderation) — do not set it here.
      })
      .select("id, type, url, title, status")
      .single();

    if (insertError) {
      console.error("Coach media insert error:", insertError);
      return NextResponse.json({ error: "No se pudo guardar el archivo." }, { status: 500 });
    }

    // New media is pending, so it won't change the public page yet — but
    // revalidate anyway so a later approval surfaces immediately is harmless
    // and keeps the dashboard/public views consistent.
    revalidateCoachPublicProfile(coach.slug);

    return NextResponse.json({ success: true, data: mediaRecord });
  } catch (error) {
    console.error("Coach media upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
