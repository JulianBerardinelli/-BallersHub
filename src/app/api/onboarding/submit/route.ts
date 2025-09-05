// app/api/onboarding/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------- Tipos que llegan del front ----------
type Step1 = {
  fullName: string;
  nationalities: { code: string; name: string }[];
  birthDate: any | null;
  position: { role: "ARQ" | "DEF" | "MID" | "DEL"; subs: string[] };
  heightCm: number | null;
  weightKg: number | null;
};
type TeamApproved = {
  mode: "approved";
  teamId: string;
  teamName: string;
  country?: string | null;
  countryCode?: string | null;
  teamCrest?: string | null;
};
type TeamNew = {
  mode: "new";
  name: string;
  country?: string | null;
  countryCode?: string | null;
  tmUrl?: string | null;
};
type TeamFree = { mode: "free" };
type CareerRow = any;

type Step2 = {
  freeAgent: boolean;
  team: TeamApproved | TeamNew | TeamFree | null;
  career: CareerRow[];
  transfermarkt?: string | null;
  besoccer?: string | null;
  social?: string | null;
};

function J(status: number, data: any) {
  return NextResponse.json(data, { status });
}
const Bad = (msg: string) => J(400, { error: msg });
const Unauth = () => J(401, { error: "unauthorized" });

export async function POST(req: Request) {
  // 1) Body
  let body: { step1: Step1; step2: Step2; kyc: { idDocKey: string; selfieKey: string } };
  try {
    body = await req.json();
  } catch {
    return Bad("invalid_json");
  }
  const { step1, step2, kyc } = body;
  if (!kyc?.idDocKey || !kyc?.selfieKey) return Bad("missing_kyc");

  // 2) Auth por header Bearer (sin cookies)
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (!token) return Unauth();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const db = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userRes, error: userErr } = await db.auth.getUser();
  const user = userRes?.user ?? null;
  if (userErr || !user) return Unauth();

  // 3) (opcional) bloquear múltiples "pending" por usuario
  const { data: existing } = await db
    .from("player_applications")
    .select("id,status")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return J(409, { error: "already_pending", id: existing.id });

  // 4) Mapear a columnas
  const nationalityNames = (step1.nationalities ?? []).map(n => n.name);
  const nationalityCodes = (step1.nationalities ?? []).map(n => n.code);
  const positions = [step1.position.role, ...step1.position.subs];

  const isFree = !!step2?.freeAgent || step2?.team?.mode === "free";

  let current_team_id: string | null = null;
  let current_club: string | null = null;
  let proposed_team_name: string | null = null;
  let proposed_team_country: string | null = null;
  let proposed_team_country_code: string | null = null;
  let proposed_team_transfermarkt_url: string | null = null;

  if (!isFree && step2?.team) {
    if (step2.team.mode === "approved") {
      current_team_id = step2.team.teamId;
      current_club = step2.team.teamName;
    } else if (step2.team.mode === "new") {
      proposed_team_name = step2.team.name;
      proposed_team_country = step2.team.country ?? null;
      proposed_team_country_code = step2.team.countryCode ?? null;
      proposed_team_transfermarkt_url = step2.team.tmUrl ?? null;
      current_club = step2.team.name;
    }
  }

  const external_profile_url = step2?.besoccer ?? step2?.social ?? null;

  const notes = JSON.stringify({
    career_draft: step2?.career ?? [],
    birth_date: step1?.birthDate ?? null,
    height_cm: step1?.heightCm ?? null,
    weight_kg: step1?.weightKg ?? null,
    nationality_codes: nationalityCodes,
    social_url: step2?.social ?? null,
    ui_version: "onboarding_v2",
  });

  const payload = {
    user_id: user.id,
    plan_requested: "free" as const,
    status: "pending" as const,
    full_name: step1.fullName || null,
    nationality: nationalityNames as any,
    positions: positions as any,
    current_club,
    transfermarkt_url: step2?.transfermarkt ?? null,
    external_profile_url,
    id_doc_url: kyc.idDocKey,
    selfie_url: kyc.selfieKey,
    notes,
    free_agent: isFree,
    current_team_id,
    proposed_team_name,
    proposed_team_country,
    proposed_team_country_code: proposed_team_country_code as any,
    proposed_team_transfermarkt_url,
    updated_at: new Date().toISOString(),
  };

  // 5) Insert (el owner NO edita mientras esté pending)
  const ins = await db.from("player_applications").insert(payload).select("id").single();
  if (ins.error) return Bad(ins.error.message);
  const appId = ins.data.id as string;

  // 6) RPC opcional (no rompe si falla)
  if (proposed_team_name) {
    await db
      .rpc("request_team_from_application", {
        p_application_id: appId,
        p_name: proposed_team_name,
        p_country: proposed_team_country ?? null,
        p_category: null,
        p_tm_url: proposed_team_transfermarkt_url ?? null,
        p_country_code: proposed_team_country_code ?? null,
      })
      .match((e: any) => console.error("request_team_from_application:", e?.message || e));
  }

  // 7) Audit (soft)
  await db
    .from("audit_logs")
    .insert({
      user_id: user.id,
      action: "player_apply_submit",
      subject_table: "player_applications",
      subject_id: appId,
      meta: { status: "pending" } as any,
    })
    .match(() => {});

  // 8) 201 OK – el front redirige a /dashboard
  return J(201, { id: appId });
}
