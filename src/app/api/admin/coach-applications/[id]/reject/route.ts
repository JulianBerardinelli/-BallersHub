// src/app/api/admin/coach-applications/[id]/reject/route.ts
//
// Rechazo de una solicitud de entrenador. A diferencia del jugador, la
// coach_applications SÍ tiene columna rejection_reason: el motivo se guarda y
// se expone al coach vía la view coach_dashboard_state (la entrega in-app del
// toast vive en el dashboard del coach — PR-4).
import { NextResponse } from "next/server";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { revalidateAdminCounters } from "@/lib/admin/counters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function POST(req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;

  // 1) auth + rol admin
  const supa = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: up, error: upErr } = await supa
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (upErr)
    return NextResponse.json({ error: `profile check failed: ${upErr.message}` }, { status: 400 });
  if (up?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // motivo opcional del rechazo
  let rejectionReason: string | null = null;
  if (req.headers.get("content-type")?.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    const r = typeof body?.rejection_reason === "string" ? body.rejection_reason.trim() : "";
    rejectionReason = r.length > 0 ? r : null;
  }

  // 2) admin client (service role) para bypassear RLS
  const admin = createSupabaseAdmin();

  // 3) marcar la solicitud rechazada + motivo
  const { error: e4 } = await admin
    .from("coach_applications")
    .update({
      status: "rejected",
      rejection_reason: rejectionReason,
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (e4) return NextResponse.json({ error: `mark rejected failed: ${e4.message}` }, { status: 400 });

  // 4) cascada: rechazar las propuestas de trayectoria pendientes de la app
  await admin
    .from("coach_career_item_proposals")
    .update({
      status: "rejected",
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("application_id", id)
    .eq("status", "pending");

  revalidateAdminCounters();
  revalidatePath("/admin/coach-applications");

  return NextResponse.json({ success: true, id });
}
