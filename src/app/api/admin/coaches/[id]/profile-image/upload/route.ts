import { NextResponse } from "next/server";
import sharp from "sharp";
import { ensureAdminActor } from "@/lib/admin/auth";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";

// Admin avatar + hero upload for ANY coach. Mirrors /api/coach/profile-image
// but is admin-gated and writes with the service-role client to the target
// coach (route [id]). Same AVIF transcode + same storage path (keyed by the
// coach's user_id) so admin and owner uploads upsert the same object.

const ACCEPTED = new Set(["image/avif", "image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX = 8 * 1024 * 1024;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const gate = await ensureAdminActor();
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });
    const admin = gate.actor.adminClient;

    const { data: coach } = await admin
      .from("coach_profiles")
      .select("id, user_id, slug")
      .eq("id", id)
      .maybeSingle<{ id: string; user_id: string; slug: string | null }>();
    if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const assetType = formData.get("assetType") as "avatar" | "hero" | null;
    if (assetType !== "avatar" && assetType !== "hero") {
      return NextResponse.json({ error: "assetType inválido." }, { status: 400 });
    }
    if (!file) return NextResponse.json({ error: "Adjuntá una imagen." }, { status: 400 });
    if (file.size > MAX) {
      return NextResponse.json({ error: "La imagen supera el límite de 8MB." }, { status: 400 });
    }
    if (!ACCEPTED.has(file.type.toLowerCase())) {
      return NextResponse.json({ error: "Formato no soportado (JPG, PNG, WebP, AVIF)." }, { status: 400 });
    }

    let uploadBuffer: Buffer;
    try {
      const input = Buffer.from(await file.arrayBuffer());
      const pipeline = sharp(input).rotate();
      if (assetType === "avatar") pipeline.resize(640, 640, { fit: "cover", position: "attention" });
      else pipeline.resize(1600, 1600, { fit: "inside", withoutEnlargement: true });
      uploadBuffer = await pipeline.avif({ quality: 70, effort: 4 }).toBuffer();
    } catch (e) {
      console.error("AVIF transcode error:", e);
      return NextResponse.json({ error: "No se pudo procesar la imagen." }, { status: 400 });
    }

    const fileName = `profile/${coach.user_id}/${assetType}.avif`;
    const { error: uploadError } = await admin.storage
      .from("coach-media")
      .upload(fileName, uploadBuffer, { contentType: "image/avif", cacheControl: "3600", upsert: true });
    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "No se pudo subir el archivo." }, { status: 500 });
    }
    const { data: urlData } = admin.storage.from("coach-media").getPublicUrl(fileName);
    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    const column = assetType === "avatar" ? "avatar_url" : "hero_url";
    const { error: updateError } = await admin
      .from("coach_profiles")
      .update({ [column]: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", coach.id);
    if (updateError) {
      console.error("coach_profiles update error:", updateError);
      return NextResponse.json({ error: "No se pudo guardar la imagen." }, { status: 500 });
    }

    revalidateCoachPublicProfile(coach.slug);
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error("Admin coach profile image upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
