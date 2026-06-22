import { NextResponse } from "next/server";
import { ensureAdminActor } from "@/lib/admin/auth";

// Admin upload of a coach license supporting document (PDF or image) for ANY
// coach. Mirrors /api/coach/license-doc/upload but is admin-gated, writes with
// the service-role client, and scopes the storage path to the TARGET coach's
// user id (the [id] route param is coach_profiles.id). Returns the public URL;
// the manager stores it on coach_licenses.doc_url via the admin upsert action.

const ACCEPTED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const MAX_BYTES = 10 * 1024 * 1024;
const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const gate = await ensureAdminActor();
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });
    const admin = gate.actor.adminClient;

    const { data: coach } = await admin
      .from("coach_profiles")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle<{ id: string; user_id: string }>();
    if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Adjuntá un archivo." }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo supera el límite de 10MB." }, { status: 400 });
    }
    const mimeType = file.type.toLowerCase();
    if (!ACCEPTED.has(mimeType)) {
      return NextResponse.json(
        { error: "Formato no soportado. Subí un PDF o una imagen (JPG, PNG, WebP)." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `licenses/${coach.user_id}/${crypto.randomUUID()}.${EXT[mimeType] ?? "bin"}`;
    const { error: uploadError } = await admin.storage
      .from("coach-media")
      .upload(fileName, buffer, { contentType: mimeType, cacheControl: "31536000", upsert: false });
    if (uploadError) {
      console.error("Admin license doc upload error:", uploadError);
      return NextResponse.json({ error: "No se pudo subir el archivo." }, { status: 500 });
    }
    const { data: urlData } = admin.storage.from("coach-media").getPublicUrl(fileName);
    return NextResponse.json({ success: true, url: urlData.publicUrl });
  } catch (error) {
    console.error("Admin coach license doc upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
