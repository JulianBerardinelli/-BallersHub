// app/api/onboarding/coach/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeStaffRoleSelection, normalizeStageRoles } from "@/lib/staff/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- Tipos que llegan del front ---------------- */
type Step1 = {
  fullName: string;
  nationalities: { code: string; name: string }[];
  birthDate: unknown | null;
  // Cargo principal del DT: "Director Técnico" / "Asistente" / "Coordinador" ...
  roleTitle: string | null;
  // Roles estructurados (staff): 1 principal + hasta 2 secundarios (enum staff_role_type).
  primaryRole?: string | null;
  secondaryRoles?: string[] | null;
};

type LicenseInput = {
  title: string;
  issuer?: string | null;
  year?: number | null;
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
  category?: string | null;
  tmUrl?: string | null;
};
type TeamFree = { mode: "free" };

type CareerItemInput = {
  id: string;
  club: string;
  // Cargo del DT en esa etapa, ej "DT principal", "Asistente técnico".
  // camelCase: es el shape que emite el wizard (Step2Career.CoachCareerStage).
  roleTitle?: string | null;
  // Hasta 3 roles estructurados ocupados en esta etapa.
  roles?: string[] | null;
  division?: string | null;
  division_id?: string | null;
  secondary_division?: string | null;
  secondary_division_id?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  team_id?: string | null;
  team_meta?: { slug?: string | null; country_code?: string | null; crest_url?: string | null } | null;
  proposed?: { country?: { code: string; name: string } | null; tmUrl?: string | null } | null;
  confirmed?: boolean;
  source?: "current" | "manual";
};

type Step2 = {
  freeAgent: boolean;
  team: TeamApproved | TeamNew | TeamFree | null;
  career: CareerItemInput[];
  licenses?: LicenseInput[];
  transfermarkt?: string | null;
  // El wizard del coach manda un solo perfil externo (no besoccer/social).
  externalProfile?: string | null;
};

function J(status: number, data: unknown) {
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

  // 3) bloquear múltiples "pending" por usuario
  const { data: existing } = await db
    .from("coach_applications")
    .select("id,status")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return J(409, { error: "already_pending", id: existing.id });

  // 4) Mapear a columnas
  const nationalityNames = (step1.nationalities ?? []).map((n) => n.name);
  const nationalityCodes = (step1.nationalities ?? []).map((n) => n.code);

  // Roles estructurados del staff (1 principal + hasta 2 secundarios, validados
  // contra el enum). null si el wizard no mandó un principal válido (legacy).
  const roleSel = normalizeStaffRoleSelection({
    primaryRole: step1.primaryRole,
    secondaryRoles: step1.secondaryRoles,
  });

  const isFree = !!step2?.freeAgent || step2?.team?.mode === "free";

  let current_team_id: string | null = null;
  let current_club: string | null = null;
  let proposed_team_name: string | null = null;
  let proposed_team_country: string | null = null;
  let proposed_team_country_code: string | null = null;
  let proposed_team_category: string | null = null;
  let proposed_team_transfermarkt_url: string | null = null;

  if (!isFree && step2?.team) {
    if (step2.team.mode === "approved") {
      current_team_id = step2.team.teamId;
      current_club = step2.team.teamName;
    } else if (step2.team.mode === "new") {
      proposed_team_name = step2.team.name;
      proposed_team_country = step2.team.country ?? null;
      proposed_team_country_code = step2.team.countryCode ?? null;
      proposed_team_category = step2.team.category ?? null;
      proposed_team_transfermarkt_url = step2.team.tmUrl ?? null;
      current_club = step2.team.name;
    }
  }

  const external_profile_url = step2?.externalProfile ?? null;

  // Licencias declaradas en el apply: [{ title, issuer, year }]
  const licensesDraft = (step2?.licenses ?? [])
    .filter((l) => l && typeof l.title === "string" && l.title.trim().length > 0)
    .map((l) => ({
      title: l.title.trim(),
      issuer: l.issuer ?? null,
      year: typeof l.year === "number" ? l.year : null,
    }));

  const notes = JSON.stringify({
    career_draft: step2?.career ?? [],
    birth_date: step1?.birthDate ?? null,
    nationality_codes: nationalityCodes,
    external_profile: step2?.externalProfile ?? null,
    ui_version: "coach_onboarding_v1",
  });

  let formattedBirthDate = null;
  if (typeof step1.birthDate === "string") {
    formattedBirthDate = step1.birthDate;
  } else if (step1.birthDate && typeof step1.birthDate === "object") {
    const b: any = step1.birthDate;
    if (b.year && b.month && b.day) {
      formattedBirthDate = `${b.year}-${String(b.month).padStart(2, "0")}-${String(b.day).padStart(2, "0")}`;
    }
  }

  const payload = {
    user_id: user.id,
    plan_requested: "free" as const,
    status: "pending" as const,
    full_name: step1.fullName || null,
    birth_date: formattedBirthDate,
    nationality: nationalityNames as string[],
    role_title: step1.roleTitle ?? null,
    primary_role: roleSel?.primaryRole ?? null,
    secondary_roles: roleSel && roleSel.secondaryRoles.length ? roleSel.secondaryRoles : null,
    current_club,
    transfermarkt_url: step2?.transfermarkt ?? null,
    external_profile_url,
    id_doc_url: kyc.idDocKey,
    selfie_url: kyc.selfieKey,
    notes,
    licenses_draft: licensesDraft,
    free_agent: isFree,
    current_team_id,
    proposed_team_name,
    proposed_team_country,
    proposed_team_country_code: proposed_team_country_code as string | null,
    proposed_team_category,
    proposed_team_transfermarkt_url,
    updated_at: new Date().toISOString(),
  };

  // 5) Insert (el owner NO edita mientras esté pending)
  const ins = await db.from("coach_applications").insert(payload).select("id").single();
  if (ins.error) return Bad(ins.error.message);
  const appId = ins.data.id as string;

  // 5.1) Guardar propuestas de trayectoria en coach_career_item_proposals
  try {
    const career = (step2?.career ?? []) as Array<CareerItemInput>;
    const rows = career.map((c) => {
      const cc = c?.proposed?.country?.code || c?.team_meta?.country_code || null;
      const cn = c?.proposed?.country?.name || null;

      // El picker puede devolver un id sintético "new:<name>|<cc>" para una
      // división que el usuario está proponiendo crear; no es un UUID válido
      // y rompería el insert. Solo persistimos UUIDs reales.
      const realDivisionId =
        typeof c.division_id === "string" && !c.division_id.startsWith("new:") ? c.division_id : null;
      const realSecondaryDivisionId =
        typeof c.secondary_division_id === "string" && !c.secondary_division_id.startsWith("new:")
          ? c.secondary_division_id
          : null;

      const stageRoles = normalizeStageRoles(c.roles);

      return {
        application_id: appId,
        club: c.club,
        role_title: c.roleTitle ?? null,
        roles: stageRoles.length ? stageRoles : null,
        division: c.division ?? null,
        division_id: realDivisionId,
        secondary_division_id: realSecondaryDivisionId,
        start_year: c.startYear ?? null,
        end_year: c.endYear ?? null,
        team_id: c.team_id ?? null,

        // si NO hay team_id, guardamos propuesta para crear team pending luego
        proposed_team_name: c.team_id ? null : c.club,
        proposed_team_country: c.team_id ? null : cn,
        proposed_team_country_code: c.team_id ? null : cc,
        proposed_team_transfermarkt_url: c?.proposed?.tmUrl ?? null,

        status: "pending" as const,
        created_by_user_id: user.id,
      };
    });

    if (rows.length) {
      // por las dudas, limpiar propuestas previas de la misma app
      await db.from("coach_career_item_proposals").delete().eq("application_id", appId);

      const { error: cipErr } = await db.from("coach_career_item_proposals").insert(rows);
      if (cipErr) {
        console.error("coach_career_item_proposals insert:", cipErr.message);
      }
    }
  } catch (e) {
    console.error("coach career proposals parse error", e);
  }

  // 6) Audit (soft)
  await db
    .from("audit_logs")
    .insert({
      user_id: user.id,
      action: "coach_apply_submit",
      subject_table: "coach_applications",
      subject_id: appId,
      meta: { status: "pending" } as Record<string, unknown>,
    });

  // 7) 201 OK – el front redirige a /dashboard
  return J(201, { id: appId });
}
