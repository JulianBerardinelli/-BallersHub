import { NextResponse } from "next/server";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { loadCoachPlanAccess } from "@/lib/dashboard/coach-plan";

// Upload de un archivo adjunto (PDF/PPT/PPTX) de un rubro de Metodología al
// bucket público coach-media. Inserta la fila coach_media (type='doc',
// rubro_id, status='pending' por default) y devuelve { id, url }. El render
// público filtra status='approved' (pre-moderado, igual que media/licencias).
//
// Gating D7: los archivos son SÓLO Pro → 403 si el coach es Free (antes de
// tocar storage). El rubro debe pertenecer al coach (anti cross-coach attach).
// Mirror de license-doc/upload (sin transcode, fidelidad del documento).

const ACCEPTED: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};
const MAX_BYTES = 25 * 1024 * 1024;

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

    // Gate Pro ANTES de leer el archivo.
    const access = await loadCoachPlanAccess(supabase, user.id);
    if (!access.isPro) {
      return NextResponse.json(
        { error: "Los archivos de metodología son una función Pro.", code: "FILES_PRO_ONLY" },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const rubroId = String(formData.get("rubroId") ?? "");
    const file = formData.get("file") as File | null;
    if (!rubroId) return NextResponse.json({ error: "Falta el rubro." }, { status: 400 });
    if (!file) return NextResponse.json({ error: "Adjuntá un archivo." }, { status: 400 });

    // El rubro debe ser del coach (RLS protege lecturas, no el write al bucket).
    const { data: rubro } = await supabase
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
    // El segmento 2 del path DEBE ser auth.uid() — la storage RLS de coach-media
    // (0015a) exige (foldername)[1] o [2] = auth.uid(); coach.id ≠ user.id haría
    // que storage rechace el upload. Mismo patrón que licenses/${user.id}, gallery/${user.id}.
    const fileName = `methodology/${user.id}/${rubroId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("coach-media")
      .upload(fileName, buffer, { contentType: mimeType, cacheControl: "31536000", upsert: false });
    if (uploadError) {
      console.error("Methodology doc upload error:", uploadError);
      return NextResponse.json({ error: "No se pudo subir el archivo." }, { status: 500 });
    }
    const { data: urlData } = supabase.storage.from("coach-media").getPublicUrl(fileName);

    // Título por default = nombre original del archivo.
    const title = (file.name || "Documento").replace(/\.[^.]+$/, "").slice(0, 120) || "Documento";

    const { data: inserted, error: insErr } = await supabase
      .from("coach_media")
      .insert({
        coach_id: coach.id,
        rubro_id: rubroId,
        type: "doc",
        url: urlData.publicUrl,
        title,
      })
      .select("id")
      .single<{ id: string }>();
    if (insErr) {
      // Rollback best-effort del objeto subido.
      await supabase.storage.from("coach-media").remove([fileName]);
      return NextResponse.json({ error: insErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: inserted.id, url: urlData.publicUrl });
  } catch (error) {
    console.error("Coach methodology doc upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
