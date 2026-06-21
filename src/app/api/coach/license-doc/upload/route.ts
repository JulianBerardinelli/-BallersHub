import { NextResponse } from "next/server";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

// Upload of a coach license supporting document (PDF or image) to the public
// coach-media bucket. The credential certificate is something the coach wants
// to showcase, so it's public — but it only renders on the portfolio once the
// license is approved (the public page filters status='approved'). Returns the
// public URL; the caller stores it on coach_licenses.doc_url via the upsert
// action. Stored as-is (no transcode) to preserve PDF/document fidelity.

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

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerRSC();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: coach } = await supabase
      .from("coach_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single<{ id: string }>();
    if (!coach) return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });

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
    const fileName = `licenses/${user.id}/${crypto.randomUUID()}.${EXT[mimeType] ?? "bin"}`;
    const { error: uploadError } = await supabase.storage
      .from("coach-media")
      .upload(fileName, buffer, { contentType: mimeType, cacheControl: "31536000", upsert: false });
    if (uploadError) {
      console.error("License doc upload error:", uploadError);
      return NextResponse.json({ error: "No se pudo subir el archivo." }, { status: 500 });
    }
    const { data: urlData } = supabase.storage.from("coach-media").getPublicUrl(fileName);
    return NextResponse.json({ success: true, url: urlData.publicUrl });
  } catch (error) {
    console.error("Coach license doc upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
