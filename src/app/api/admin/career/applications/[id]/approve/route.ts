// app/api/admin/career/applications/[id]/approve/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

function slugify(input: string) {
  return (input || "team")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "team";
}
async function ensureUniqueTeamSlug(base: string, admin: ReturnType<typeof createSupabaseAdmin>) {
  const MAX = 60;
  const candidate = base.slice(0, MAX);
  const { data } = await admin.from("teams").select("slug").ilike("slug", `${candidate}%`);
  const taken = new Set((data ?? []).map((r: { slug: string }) => r.slug));
  if (!taken.has(candidate)) return candidate;
  for (let n = 2; n < 1000; n++) {
    const next = `${candidate.slice(0, MAX - (`-${n}`).length)}-${n}`;
    if (!taken.has(next)) return next;
  }
  return `${candidate}-${Date.now()}`;
}

export async function POST(_req: Request, ctx: { params: Params }) {
  const { id: applicationId } = await ctx.params;

  const supa = await createSupabaseServerRoute();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: up } = await supa.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (up?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createSupabaseAdmin();

  const { data: app, error: eApp } = await admin
    .from("player_applications")
    .select("id, proposed_team_name")
    .eq("id", applicationId)
    .maybeSingle();
  if (eApp) return NextResponse.json({ error: eApp.message }, { status: 400 });
  if (!app) return NextResponse.json({ error: "application_not_found" }, { status: 404 });

  async function findExistingTeamIdByName(nameRaw: string): Promise<string | null> {
    const name = nameRaw.trim();
    if (!name) return null;
    const slug = slugify(name);

    const bySlug = await admin.from("teams").select("id").eq("slug", slug).maybeSingle();
    if (bySlug.data?.id) return bySlug.data.id as string;

    const byName = await admin.from("teams").select("id").ilike("name", name);
    if (byName.data && byName.data.length > 0) return byName.data[0].id as string;

    return null;
  }

  const { data: items, error: eCip } = await admin
    .from("career_item_proposals")
    .select("*")
    .eq("application_id", applicationId)
    .eq("status", "pending");
  if (eCip) return NextResponse.json({ error: eCip.message }, { status: 400 });

  if (!items || items.length === 0) {
    return NextResponse.json({ ok: true, created_teams: 0, accepted_items: 0 }, { status: 200 });
  }

  const createdForName = new Map<string, string>(); // name_lower -> team_id
  let createdTeams = 0;
  let acceptedItems = 0;
  const nowIso = new Date().toISOString();

  for (const it of items) {
    if (it.team_id) {
      const { error } = await admin
        .from("career_item_proposals")
        .update({ status: "accepted", reviewed_by_user_id: user.id, reviewed_at: nowIso })
        .eq("id", it.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      acceptedItems++;
      continue;
    }

    const displayName = (it.proposed_team_name || it.club || "").trim();
    const key = displayName.toLowerCase();

    // reutilizar si ya lo creamos en esta tanda
    let teamId = createdForName.get(key) || null;
    if (!teamId) teamId = await findExistingTeamIdByName(displayName);

    if (!teamId) {
      const slug = await ensureUniqueTeamSlug(slugify(displayName), admin);
      const ins = await admin
        .from("teams")
        .insert({
          name: displayName,
          slug,
          country: it.proposed_team_country ?? null,
          country_code: it.proposed_team_country_code ?? null,
          category: it.division ?? null,
          transfermarkt_url: it.proposed_team_transfermarkt_url ?? null,
          requested_in_application_id: applicationId,
          requested_by_user_id: it.created_by_user_id ?? user.id,
          requested_from_career_item_id: it.id,            // 👈 enlazamos con la CIP
          status: "pending",
          visibility: "public",
        })
        .select("id")
        .single();
      if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 400 });
      teamId = ins.data.id as string;
      createdForName.set(key, teamId);
      createdTeams++;
    }

    const upd = await admin
      .from("career_item_proposals")
      .update({
        team_id: teamId,
        status: "accepted",
        reviewed_by_user_id: user.id,                      // auditoría
        reviewed_at: nowIso,                                // auditoría
      })
      .eq("id", it.id);
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 400 });

    acceptedItems++;
  }

  return NextResponse.json(
    { ok: true, created_teams: createdTeams, accepted_items: acceptedItems },
    { status: 200 }
  );
}
