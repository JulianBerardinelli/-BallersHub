// POST /api/blog/media/upload
//
// Sube imágenes para el blog (hero image del post + imágenes inline
// del cuerpo del editor TipTap) al bucket `blog-media`.
//
// Patrón consciente del de /api/media/upload (player media):
//   - sharp transcode a AVIF q60 (size savings + consistency)
//   - 5MB max, JPEG/PNG/WebP/AVIF aceptados
//   - Path: `{user_id}/{uuid}.avif` — RLS storage checkea
//     foldername(name)[1] = auth.uid()::text
//
// Permisos: requireBlogger() — solo whitelisted bloggers (is_blogger)
// y admins pueden uploadear. Las RLS del bucket lo refuerzan a nivel
// DB; el check app-side da mejor UX (403 explícito).
//
// La RLS del bucket ya filtra a is_blogger; este check duplica
// intencionalmente para devolver 403 con mensaje claro en lugar de
// que el upload falle silenciosamente con error de Supabase.

import { NextResponse } from "next/server";
import sharp from "sharp";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { requireBlogger } from "@/lib/blog/permissions";

const ACCEPTED_IMAGE_MIME = new Set([
  "image/avif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// AVIF quality 60 — mismo preset que player-media. "Visually lossless
// for editorial photos", typically beats JPEG q85 en size + quality.
const AVIF_QUALITY = 60;

export async function POST(req: Request) {
  try {
    // Authorize: blogger (is_blogger=true) o admin.
    let userId: string;
    try {
      const actor = await requireBlogger();
      userId = actor.userId;
    } catch (err) {
      const code = err instanceof Error ? err.message : "UNAUTHORIZED";
      return NextResponse.json(
        { error: code === "UNAUTHENTICATED" ? "No session" : "No autorizado — solo bloggers pueden subir imágenes" },
        { status: code === "UNAUTHENTICATED" ? 401 : 403 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Falta archivo" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: `La imagen supera ${MAX_IMAGE_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      );
    }

    const mimeType = file.type.toLowerCase();
    if (!ACCEPTED_IMAGE_MIME.has(mimeType)) {
      return NextResponse.json(
        { error: "Formato no soportado. Subí JPG, PNG, WebP o AVIF." },
        { status: 400 },
      );
    }

    // Transcode a AVIF salvo que ya sea AVIF (passthrough).
    let uploadBuffer: Buffer;
    if (mimeType === "image/avif") {
      uploadBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      try {
        const input = Buffer.from(await file.arrayBuffer());
        uploadBuffer = await sharp(input)
          .rotate() // honor EXIF orientation
          .avif({ quality: AVIF_QUALITY, effort: 4 })
          .toBuffer();
      } catch (transcodeError) {
        console.error("[blog/media] AVIF transcode error:", transcodeError);
        return NextResponse.json(
          { error: "No se pudo procesar la imagen. Probá con otro archivo." },
          { status: 400 },
        );
      }
    }

    // Path: {user_id}/{uuid}.avif — primer segmento = user_id, así la
    // policy storage.foldername(name)[1] = auth.uid() funciona.
    const fileName = `${userId}/${crypto.randomUUID()}.avif`;

    const supabase = await createSupabaseServerRSC();
    const { error: uploadError } = await supabase.storage
      .from("blog-media")
      .upload(fileName, uploadBuffer, {
        contentType: "image/avif",
        cacheControl: "31536000", // 1 año, immutable (UUID en el nombre)
        upsert: false,
      });

    if (uploadError) {
      console.error("[blog/media] upload error:", uploadError);
      return NextResponse.json(
        { error: "No se pudo subir la imagen al storage." },
        { status: 500 },
      );
    }

    const { data: urlData } = supabase.storage.from("blog-media").getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: fileName,
    });
  } catch (error: unknown) {
    console.error("[blog/media] uncaught error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
