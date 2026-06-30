import { NextResponse } from "next/server";
import { ensureAdminActor } from "@/lib/admin/auth";

// Admin upload de un archivo (PDF/PPT/PPTX) de un rubro de Metodología para
// CUALQUIER coach. Espeja /api/coach/methodology-doc/upload pero admin-gated,
// escribe con el service-role client, scopea el path al user_id del coach
// TARGET (el [id] es coach_profiles.id) e inserta coach_media type='doc'
// APPROVED (el admin es el moderador → publicado al instante, sin cola). El
// admin NO está sujeto al gate Pro de los archivos.

const ACCEPTED: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};
const MAX_BYTES = 25 * 1024 * 1024;

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
    const rubroId = String(formData.get("rubroId") ?? "");
    const file = formData.get("file") as File | null;
    if (!rubroId) return NextResponse.json({ error: "Falta el rubro." }, { status: 400 });
    if (!file) return NextResponse.json({ error: "Adjuntá un archivo." }, { status: 400 });

    // El rubro debe pertenecer al coach target (anti cross-coach attach).
    const { data: rubro } = await admin
      .from("coach_methodology_rubros")
      .select("id")
      .eq("id", rubroId)
      .eq("coach_id", coach.id)
      .maybeSingle<{ id: string }>();
    if (!rubro) return NextResponse.json({ error: "Rubro inválido." }, { status: 404 });

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo supera el límite de 25MB." }, { status: 400 });
    }
    const mimeType = file.type.toLowerCase();
    const ext = ACCEPTED[mimeType];
    if (!ext) {
      return NextResponse.json(
        { error: "Formato no soportado. Subí un PDF, PPT o PPTX." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // El path se scopea al user_id del coach target (igual que el upload admin de
    // licencias). El service-role bypassa la storage RLS, pero mantenemos el
    // patrón para que la limpieza/derivación de path sea consistente.
    const fileName = `methodology/${coach.user_id}/${rubroId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from("coach-media")
      .upload(fileName, buffer, { contentType: mimeType, cacheControl: "31536000", upsert: false });
    if (uploadError) {
      console.error("Admin methodology doc upload error:", uploadError);
      return NextResponse.json({ error: "No se pudo subir el archivo." }, { status: 500 });
    }
    const { data: urlData } = admin.storage.from("coach-media").getPublicUrl(fileName);

    const title = (file.name || "Documento").replace(/\.[^.]+$/, "").slice(0, 120) || "Documento";

    const { data: inserted, error: insErr } = await admin
      .from("coach_media")
      .insert({
        coach_id: coach.id,
        rubro_id: rubroId,
        type: "doc",
        url: urlData.publicUrl,
        title,
        status: "approved",
        reviewed_by_user_id: gate.actor.actorId,
        reviewed_at: new Date().toISOString(),
      })
      .select("id")
      .single<{ id: string }>();
    if (insErr) {
      await admin.storage.from("coach-media").remove([fileName]);
      return NextResponse.json({ error: insErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: inserted.id, url: urlData.publicUrl });
  } catch (error) {
    console.error("Admin coach methodology doc upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
