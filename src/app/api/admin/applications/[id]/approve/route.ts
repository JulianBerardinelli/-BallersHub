// // src/app/api/admin/applications/[id]/approve/route.ts
// import { NextResponse } from "next/server";
// import { createSupabaseServerRoute } from "@/lib/supabase/server";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// type Params = Promise<{ id: string }>;

// async function doApprove(params: Params) {
//   const { id } = await params;

//   const supa = await createSupabaseServerRoute();
//   const { data: { user } } = await supa.auth.getUser();
//   if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

//   // Guardado extra en app (además del check SQL)
//   const { data: up } = await supa.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
//   if (up?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

//   const { data, error } = await supa.rpc("approve_player_application", { p_id: id });
//   if (error) return NextResponse.json({ error: `rpc failed: ${error.message}` }, { status: 400 });

//   return NextResponse.redirect(
//     new URL("/admin/applications", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
//     { status: 303 }
//   );
// }

// export async function POST(_req: Request, ctx: { params: Params }) { return doApprove(ctx.params); }
// export async function GET(_req: Request, ctx: { params: Params }) { return doApprove(ctx.params); }

// app/api/admin/applications/[id]/approve/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const FREE_LIMITS = {
  max_photos: 0,
  max_videos: 1,
  reviews_enabled: false,
  can_invite_reviews: false,
  max_active_invitations: 0,
  stats_by_year_enabled: false,
  branding_ads_visible: true,
  branding_partner: "service",
} as const;

function slugify(input: string) {
  return (input || "player")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "player";
}

async function ensureUniqueSlug(base: string, admin: ReturnType<typeof createSupabaseAdmin>) {
  const MAX = 60;
  const candidate = base.slice(0, MAX);
  const { data, error } = await admin
    .from("player_profiles")
    .select("slug")
    .ilike("slug", `${candidate}%`);
  if (error) throw new Error(`slug query failed: ${error.message}`);

  const existing = new Set((data ?? []).map((r: { slug: string }) => r.slug));
  if (!existing.has(candidate)) return candidate;

  for (let n = 2; n < 1000; n++) {
    const next = `${candidate.slice(0, MAX - (`-${n}`).length)}-${n}`;
    if (!existing.has(next)) return next;
  }
  throw new Error("no available slug");
}

// 👇 Next 15: params puede ser Promise
type Params = Promise<{ id: string }>;

export async function POST(req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;

  // 1) auth + rol admin (cliente con cookies)
  const supa = await createSupabaseServerRoute();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: up, error: upErr } = await supa
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (upErr) return NextResponse.json({ error: `profile check failed: ${upErr.message}` }, { status: 400 });
  if (up?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Petición JSON: extraer overrides (opcional)
  type Overrides = {
    full_name?: string;
    transfermarkt_url?: string;
    height_cm?: number;
    weight_kg?: number;
    birth_date?: string;
  };
  let overrides: Overrides = {};
  if (req.headers.get("content-type")?.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    if (body.overrides) overrides = body.overrides;
  }

  // 2) admin client (service role) para bypassear RLS
  const admin = createSupabaseAdmin();

  // Guardar los overrides localmente en player_applications si es necesario guardarlos:
  if (Object.keys(overrides).length > 0) {
    const updatePayload: Partial<Overrides> = {};
    if (overrides.full_name !== undefined) updatePayload.full_name = overrides.full_name;
    if (overrides.transfermarkt_url !== undefined) updatePayload.transfermarkt_url = overrides.transfermarkt_url;

    if (Object.keys(updatePayload).length > 0) {
      const { error: ovErr } = await admin
        .from("player_applications")
        .update(updatePayload)
        .eq("id", id);
      if (ovErr) {
        return NextResponse.json({ error: `Failed to save overrides: ${ovErr.message}` }, { status: 400 });
      }
    }
  }

  // 3) cargar solicitud
  const { data: app, error: e1 } = await admin
    .from("player_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (e1) return NextResponse.json({ error: `load application failed: ${e1.message}` }, { status: 400 });
  if (!app) return NextResponse.json({ error: `application ${id} not found` }, { status: 404 });

  // 3b) si hay team, levantamos su nombre por las dudas
  const teamName: string | null = app.current_team_id
    ? (await admin.from("teams").select("name").eq("id", app.current_team_id).maybeSingle()).data?.name ?? null
    : null;

  // 3c) no permitir aprobar si la trayectoria está "waiting"
  const { data: waiting, error: wErr } = await admin
    .from("career_item_proposals")
    .select("id")
    .eq("application_id", id)
    .eq("status", "waiting")
    .limit(1);
  if (wErr) return NextResponse.json({ error: `waiting check failed: ${wErr.message}` }, { status: 400 });
  if ((waiting ?? []).length > 0) return NextResponse.json({ error: "trajectory waiting" }, { status: 400 });

  // 4) slug único para el jugador
  const slug = await ensureUniqueSlug(slugify(app.full_name ?? "player"), admin);

  // 4b) Extraer fallback info de app.notes
  let fallbackBirth: string | null = null;
  let fallbackHeight: number | null = null;
  let fallbackWeight: number | null = null;
  try {
    if (app.notes) {
      const parsedNotes = typeof app.notes === "string" ? JSON.parse(app.notes) : app.notes;
      if (typeof parsedNotes.birth_date === "string") fallbackBirth = parsedNotes.birth_date;
      if (typeof parsedNotes.height_cm === "number") fallbackHeight = parsedNotes.height_cm;
      if (typeof parsedNotes.weight_kg === "number") fallbackWeight = parsedNotes.weight_kg;
    }
  } catch (e) {}

  // 5) crear player_profile (incluye current_team_id si existe)
  const e2 = await admin
    .from("player_profiles")
    .insert({
      user_id: app.user_id,
      slug,
      full_name: overrides.full_name ?? app.full_name ?? "Player",
      nationality: app.nationality ?? null,
      positions: app.positions ?? null,
      current_club: teamName ?? app.current_club ?? null, // preferimos nombre real del team
      current_team_id: app.current_team_id ?? null,
      transfermarkt_url: overrides.transfermarkt_url ?? app.transfermarkt_url ?? null, // Migramos el override
      height_cm: overrides.height_cm ?? fallbackHeight ?? null,
      weight_kg: overrides.weight_kg ?? fallbackWeight ?? null,
      birth_date: overrides.birth_date ?? fallbackBirth ?? null,
      bio: null,
      visibility: "public",
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .select("id,slug")
    .single();
  if (e2.error || !e2.data) return NextResponse.json({ error: `create player failed: ${e2.error?.message}` }, { status: 400 });
  const newProfileId = e2.data.id;

  // 5.5) Crear el dashboard player_link automáticamente si hay url de transfermarkt
  const tmUrl = overrides.transfermarkt_url ?? app.transfermarkt_url;
  if (tmUrl) {
    const { error: tmErr } = await admin.from("player_links").insert({
      player_id: newProfileId,
      kind: "transfermarkt",
      url: tmUrl,
      label: "Transfermarkt",
      is_primary: false,
    });
    if (tmErr) console.error("Could not insert transfermarkt player_link:", tmErr);
  }

  // 6) upsert suscripción free
  const { error: e3 } = await admin
    .from("subscriptions")
    .upsert(
      {
        user_id: app.user_id,
        plan: "free",
        status: "active",
        limits_json: FREE_LIMITS as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (e3) return NextResponse.json({ error: `upsert subscription failed: ${e3.message}` }, { status: 400 });


  // 6.5) materializar trayectoria aceptada (si hay)
  //    Usamos el cliente con sesión de usuario para que `auth.uid()` en la función SQL
  //    coincida con el admin autenticado y supere la validación de `is_admin`.
  const { error: matErr } = await supa.rpc("materialize_career_from_application", {
    p_application_id: id,
  });
  if (matErr) {
    return NextResponse.json(
      { error: `materialize failed: ${matErr.message}` },
      { status: 400 }
    );
  }

  // 7) marcar solicitud aprobada
  const { error: e4 } = await admin
    .from("player_applications")
    .update({
      status: "approved",
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (e4) return NextResponse.json({ error: `mark approved failed: ${e4.message}` }, { status: 400 });

  // 8) response JSON in AJAX context
  return NextResponse.json({ success: true, slug });
}
