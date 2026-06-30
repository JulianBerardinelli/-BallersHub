// src/app/api/admin/coach-applications/[id]/approve/route.ts
//
// Aprobación de una solicitud de entrenador (coach). Espejo del approve del
// jugador, pero apoyado en los RPC SECURITY DEFINER del pack coach:
//   - approve_coach_application(p_id)        → crea coach_profile (approved +
//     slug único) + materializa licenses_draft → coach_licenses (approved) +
//     marca la application approved. Idempotente por user.
//   - materialize_coach_career_from_application(p_application_id) → vuelca las
//     coach_career_item_proposals 'accepted' a coach_career_items.
// Ambos RPC se llaman con el cliente de COOKIES para que auth.uid() sea el
// admin y pase el guard is_admin(auth.uid()) interno.
//
// Simplificación v1 vs jugador: NO hay cola /admin/coach-career separada. Esta
// ruta acepta las proposals pendientes de la app y materializa en un paso. El
// RPC resuelve el team por nombre si existe (approved>pending); si no, la etapa
// queda con el club como texto (linkeo de team a cargo del admin más tarde).
import { NextResponse } from "next/server";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { revalidateAdminCounters } from "@/lib/admin/counters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

type Overrides = {
  full_name?: string;
  role_title?: string;
  transfermarkt_url?: string;
  birth_date?: string;
};

export async function POST(req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;

  // 1) auth + rol admin (cookie client — auth.uid() debe ser el admin para los RPC)
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

  // overrides opcionales (JSON)
  let overrides: Overrides = {};
  if (req.headers.get("content-type")?.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    if (body?.overrides) overrides = body.overrides as Overrides;
  }

  // 2) admin client (service role) para lecturas/updates directos
  const admin = createSupabaseAdmin();

  // 2b) guardar overrides en coach_applications ANTES del RPC (el RPC lee
  //     full_name / role_title de la application).
  if (Object.keys(overrides).length > 0) {
    const updatePayload: Partial<Overrides> = {};
    if (overrides.full_name !== undefined) updatePayload.full_name = overrides.full_name;
    if (overrides.role_title !== undefined) updatePayload.role_title = overrides.role_title;
    if (overrides.transfermarkt_url !== undefined)
      updatePayload.transfermarkt_url = overrides.transfermarkt_url;
    if (overrides.birth_date !== undefined) updatePayload.birth_date = overrides.birth_date;
    if (Object.keys(updatePayload).length > 0) {
      const { error: ovErr } = await admin
        .from("coach_applications")
        .update(updatePayload)
        .eq("id", id);
      if (ovErr)
        return NextResponse.json({ error: `Failed to save overrides: ${ovErr.message}` }, { status: 400 });
    }
  }

  // 3) cargar solicitud
  const { data: app, error: e1 } = await admin
    .from("coach_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (e1) return NextResponse.json({ error: `load application failed: ${e1.message}` }, { status: 400 });
  if (!app) return NextResponse.json({ error: `application ${id} not found` }, { status: 404 });

  const teamName: string | null = app.current_team_id
    ? (await admin.from("teams").select("name").eq("id", app.current_team_id).maybeSingle()).data
        ?.name ?? null
    : null;

  // 4) Aprobar vía RPC (crea coach_profile approved + slug + materializa licencias).
  const { data: rpcData, error: rpcErr } = await supa.rpc("approve_coach_application", { p_id: id });
  if (rpcErr) return NextResponse.json({ error: `rpc approve failed: ${rpcErr.message}` }, { status: 400 });
  const result = (rpcData ?? {}) as { coach_id?: string; slug?: string; idempotent?: boolean };
  if (!result.coach_id || !result.slug)
    return NextResponse.json({ error: "rpc returned no coach_id/slug" }, { status: 400 });
  const coachId = result.coach_id;
  const slug = result.slug;

  // 5) rol member -> coach (no pisa admin/manager/player existentes)
  await admin
    .from("user_profiles")
    .update({ role: "coach" })
    .eq("user_id", app.user_id)
    .in("role", ["member"]);

  // 6) carry-over de campos ricos que el RPC no setea (team actual, fecha, TM, códigos)
  let fallbackBirth: string | null = null;
  let nationalityCodes: string[] | null = null;
  try {
    if (app.notes) {
      const n = typeof app.notes === "string" ? JSON.parse(app.notes) : app.notes;
      if (typeof n?.birth_date === "string") fallbackBirth = n.birth_date;
      if (Array.isArray(n?.nationality_codes)) nationalityCodes = n.nationality_codes;
    }
  } catch {
    /* notes no-JSON: ignorar */
  }

  const { error: updErr } = await admin
    .from("coach_profiles")
    .update({
      current_team_id: app.current_team_id ?? null,
      current_club: teamName ?? app.current_club ?? null,
      birth_date: overrides.birth_date ?? app.birth_date ?? fallbackBirth ?? null,
      transfermarkt_url: overrides.transfermarkt_url ?? app.transfermarkt_url ?? null,
      nationality_codes: nationalityCodes,
      // Roles estructurados elegidos en el onboarding (el RPC sólo setea role_title).
      primary_role: app.primary_role ?? null,
      secondary_roles: app.secondary_roles ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", coachId);
  if (updErr) console.error("coach_profiles enrich update:", updErr.message);

  // Sólo materializamos URLs http(s) en coach_links: estas URLs se renderizan
  // como <a href> en la página pública, así que un esquema javascript:/data:
  // (si una application maliciosa lo trae) sería un vector de XSS. Espeja el
  // refine de coachLinkMutationSchema sin arrastrar zod al route handler.
  const isSafeHttpUrl = (u: unknown): u is string =>
    typeof u === "string" && /^https?:\/\//i.test(u.trim());

  // 6.5) link Transfermarkt (paridad con el jugador)
  const tmUrl = overrides.transfermarkt_url ?? app.transfermarkt_url;
  if (isSafeHttpUrl(tmUrl)) {
    const { error: tmErr } = await admin.from("coach_links").insert({
      coach_id: coachId,
      kind: "transfermarkt",
      url: tmUrl.trim(),
      label: "Transfermarkt",
      is_primary: false,
    });
    if (tmErr) console.error("coach_links transfermarkt:", tmErr.message);
  }

  // 6.6) externalProfileUrl del Step2 → coach_links (kind='custom'). Hasta P0.3
  // este campo se perdía en el approve (la columna existía en coach_applications
  // pero nadie la materializaba). Sin label → el público muestra "Sitio web".
  const extUrl = app.external_profile_url;
  if (isSafeHttpUrl(extUrl)) {
    const { error: extErr } = await admin.from("coach_links").insert({
      coach_id: coachId,
      kind: "custom",
      url: extUrl.trim(),
      label: null,
      is_primary: false,
    });
    if (extErr) console.error("coach_links externalProfile:", extErr.message);
  }

  // 6.7) fila base de coach_personal_details (idempotente). Sin datos cargados
  // → todos null + show_contact_section=false. El editor /dashboard/coach/
  // personal-data hace el upsert "real" cuando el coach completa los campos.
  const { error: pdErr } = await admin
    .from("coach_personal_details")
    .upsert(
      { coach_id: coachId },
      { onConflict: "coach_id", ignoreDuplicates: true },
    );
  if (pdErr) console.error("coach_personal_details bootstrap:", pdErr.message);

  // 7) aceptar las proposals pendientes y materializar la trayectoria.
  await admin
    .from("coach_career_item_proposals")
    .update({
      status: "accepted",
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("application_id", id)
    .eq("status", "pending");

  const { error: matErr } = await supa.rpc("materialize_coach_career_from_application", {
    p_application_id: id,
  });
  if (matErr)
    return NextResponse.json({ error: `materialize failed: ${matErr.message}` }, { status: 400 });

  // 8) revalidar badges del admin + la cola. (El portfolio /coach/[slug] llega en PR-3.)
  revalidateAdminCounters();
  revalidatePath("/admin/coach-applications");

  return NextResponse.json({ success: true, slug, coachId });
}
