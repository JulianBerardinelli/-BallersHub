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

  const existing = new Set((data ?? []).map((r: any) => r.slug));
  if (!existing.has(candidate)) return candidate;

  for (let n = 2; n < 1000; n++) {
    const next = `${candidate.slice(0, MAX - (`-${n}`).length)}-${n}`;
    if (!existing.has(next)) return next;
  }
  throw new Error("no available slug");
}

// 👇 Next 15: params puede ser Promise
type Params = Promise<{ id: string }>;

async function doApprove(params: Params) {
  const { id } = await params;

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

  // 2) admin client (service role) para bypassear RLS
  const admin = createSupabaseAdmin();

  // 3) cargar solicitud
  const { data: app, error: e1 } = await admin
    .from("player_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (e1) return NextResponse.json({ error: `load application failed: ${e1.message}` }, { status: 400 });
  if (!app) return NextResponse.json({ error: `application ${id} not found` }, { status: 404 });

  // 3b) si hay team, levantamos su nombre por las dudas
  let teamName: string | null = app.current_team_id ?? null
    ? (await admin.from("teams").select("name").eq("id", app.current_team_id).maybeSingle()).data?.name ?? null
    : null;

  // 4) slug único para el jugador
  const slug = await ensureUniqueSlug(slugify(app.full_name ?? "player"), admin);

  // 5) crear player_profile (incluye current_team_id si existe)
  const { error: e2 } = await admin
    .from("player_profiles")
    .insert({
      user_id: app.user_id,
      slug,
      full_name: app.full_name ?? "Player",
      nationality: app.nationality ?? null,
      positions: app.positions ?? null,
      current_club: teamName ?? app.current_club ?? null, // preferimos nombre real del team
      current_team_id: app.current_team_id ?? null,       // 👈 NUEVO: FK al team
      bio: null,
      visibility: "public",
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .select("id,slug")
    .single();
  if (e2) return NextResponse.json({ error: `create player failed: ${e2.message}` }, { status: 400 });

  // 6) upsert suscripción free
  const { error: e3 } = await admin
    .from("subscriptions")
    .upsert(
      {
        user_id: app.user_id,
        plan: "free",
        status: "active",
        limits_json: FREE_LIMITS as any,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (e3) return NextResponse.json({ error: `upsert subscription failed: ${e3.message}` }, { status: 400 });

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

  // 8) redirect
  return NextResponse.redirect(new URL("/admin/applications", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"), { status: 303 });
}

export async function POST(_req: Request, ctx: { params: Params }) {
  return doApprove(ctx.params);
}
export async function GET(_req: Request, ctx: { params: Params }) {
  return doApprove(ctx.params);
}
