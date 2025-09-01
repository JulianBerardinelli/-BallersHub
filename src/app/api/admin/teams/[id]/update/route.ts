import { NextResponse } from "next/server";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

// Next 15: params puede ser Promise
type Params = Promise<{ id: string }>;

function slugify(input: string) {
  return (input || "team")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "team";
}

async function ensureUniqueTeamSlug(base: string, id: string, admin: ReturnType<typeof createSupabaseAdmin>) {
  const MAX = 60;
  const candidate = base.slice(0, MAX);
  const { data, error } = await admin
    .from("teams")
    .select("id,slug")
    .ilike("slug", `${candidate}%`);
  if (error) throw new Error(`slug query failed: ${error.message}`);

  // ya existe exactamente y no es el mismo registro
  const existing = new Set<string>((data ?? []).map((r: any) => r.slug));
  if (!existing.has(candidate)) return candidate;

  // si el registro actual ya usa ese slug, lo permitimos
  const mine = (data ?? []).find((r: any) => r.id === id);
  if (mine?.slug === candidate) return candidate;

  for (let n = 2; n < 1000; n++) {
    const next = `${candidate.slice(0, MAX - (`-${n}`).length)}-${n}`;
    if (!existing.has(next)) return next;
  }
  throw new Error("no available slug");
}

async function doUpdate(req: Request, params: Params) {
  const { id } = await params;

  // 1) auth + rol admin (vía cookie)
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

  // 3) cargar equipo actual
  const { data: current, error: e0 } = await admin
    .from("teams")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (e0) return NextResponse.json({ error: `load team failed: ${e0.message}` }, { status: 400 });
  if (!current) return NextResponse.json({ error: `team ${id} not found` }, { status: 404 });

  // 4) payload permitido
  const payload = await req.json();
  const allowed = [
    "name",
    "slug",
    "country",
    "country_code",
    "category",
    "transfermarkt_url",
    "tags",
    "alt_names",
    "status",
    "featured",
    "visibility",
  ] as const;

  const update: Record<string, any> = {};
  for (const k of allowed) if (k in payload) update[k] = payload[k];

  // Normalizaciones
  if ("country_code" in update && update.country_code) {
    update.country_code = String(update.country_code).toUpperCase().slice(0, 2);
  }
  if ("tags" in update && !Array.isArray(update.tags)) update.tags = [];
  if ("alt_names" in update && !Array.isArray(update.alt_names)) update.alt_names = [];

  // Slug: si viene vacío o cambia, generamos/aseguramos único
  const desiredSlug =
    (typeof update.slug === "string" && update.slug.trim())
      ? slugify(update.slug)
      : slugify(update.name ?? current.name);

  if (desiredSlug !== current.slug) {
    update.slug = await ensureUniqueTeamSlug(desiredSlug, id, admin);
  } else {
    update.slug = current.slug;
  }

  // 5) update
  const { data, error } = await admin
    .from("teams")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(req: Request, ctx: { params: Params }) {
  return doUpdate(req, ctx.params);
}
