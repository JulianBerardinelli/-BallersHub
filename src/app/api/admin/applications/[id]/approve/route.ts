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
  const base = (input || "jugador")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "jugador";
}

async function ensureUniqueSlug(base: string, client: any): Promise<string> {
  const MAX = 60;
  const candidate = base.slice(0, MAX);

  const { data: rows, error } = await client
    .from("player_profiles")
    .select("slug")
    .ilike("slug", `${candidate}%`);
  if (error) throw error;

  const existing = new Set((rows ?? []).map((r: any) => r.slug));
  if (!existing.has(candidate)) return candidate;

  for (let n = 2; n < 1000; n++) {
    const suffix = `-${n}`;
    const next = `${candidate.slice(0, MAX - suffix.length)}${suffix}`;
    if (!existing.has(next)) return next;
  }
  throw new Error("No hay slug disponible");
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    // 1) Autenticar caller y verificar rol con cliente "route" (cookies OK)
    const supa = await createSupabaseServerRoute();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: up } = await supa
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (up?.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 2) Usar Service Role para bypassear RLS en TODAS las escrituras
    const admin = createSupabaseAdmin();

    // 3) Cargar solicitud
    const { data: app, error: e1 } = await admin
      .from("player_applications")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    if (e1 || !app) return NextResponse.json({ error: "not found" }, { status: 404 });

    // 4) Slug único
    const base = slugify(app.full_name ?? "jugador");
    const slug = await ensureUniqueSlug(base, admin);

    // 5) Crear player_profile (approved/public)
    const { data: pp, error: e2 } = await admin
      .from("player_profiles")
      .insert({
        user_id: app.user_id,
        slug,
        full_name: app.full_name ?? "Jugador",
        nationality: app.nationality ?? null,
        positions: app.positions ?? null,
        current_club: app.current_club ?? null,
        bio: null,
        visibility: "public",
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .select("id,slug")
      .single();
    if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

    // 6) Upsert de suscripción (free)
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
    if (e3) return NextResponse.json({ error: e3.message }, { status: 400 });

    // 7) Marcar solicitud aprobada
    const { error: e4 } = await admin
      .from("player_applications")
      .update({
        status: "approved",
        reviewed_by_user_id: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);
    if (e4) return NextResponse.json({ error: e4.message }, { status: 400 });

    // 8) Redirect al listado
    return NextResponse.redirect(new URL(`/admin/applications`, req.url));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "internal error" }, { status: 500 });
  }
}
