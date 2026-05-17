import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

import AgencyTeamProposalsClient from "./components/AgencyTeamProposalsClient";

export const metadata = {
  title: "Solicitudes de equipos · Admin",
};

// Render-time shape (camelCase) — matches what AgencyTeamProposalsClient
// already expects, mapped from Supabase REST snake_case.
type Submission = {
  id: string;
  agency_id: string;
  note: string | null;
  submitted_at: string;
};

type Proposal = {
  id: string;
  submission_id: string;
  team_id: string | null;
  proposed_team_name: string | null;
  proposed_team_country: string | null;
  proposed_team_country_code: string | null;
  proposed_team_division: string | null;
  proposed_team_transfermarkt_url: string | null;
  relation_kind: string;
  description: string | null;
};

type AgencyRef = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type TeamRef = {
  id: string;
  name: string;
  country: string | null;
  country_code: string | null;
  slug: string;
};

export default async function AgencyTeamProposalsAdminPage() {
  noStore();

  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/agency-team-proposals");

  // Migrated to Supabase REST (service role). The 3 db.query.* calls
  // here used to envenom the pooler under load. See PERFORMANCE_PLAN.md.
  const admin = createSupabaseAdmin();

  const submissionsRes = await admin
    .from("agency_team_relation_submissions")
    .select("id, agency_id, note, submitted_at")
    .eq("status", "pending")
    .order("submitted_at", { ascending: false });

  const submissions = (submissionsRes.data ?? []) as Submission[];
  const submissionIds = submissions.map((s) => s.id);

  const [itemsRes, agenciesRes] = await Promise.all([
    submissionIds.length
      ? admin
          .from("agency_team_relation_proposals")
          .select(
            "id, submission_id, team_id, proposed_team_name, proposed_team_country, proposed_team_country_code, proposed_team_division, proposed_team_transfermarkt_url, relation_kind, description",
          )
          .in("submission_id", submissionIds)
      : Promise.resolve({ data: [] as Proposal[] }),
    submissions.length
      ? admin
          .from("agency_profiles")
          .select("id, name, slug, logo_url")
          .in(
            "id",
            Array.from(new Set(submissions.map((s) => s.agency_id))),
          )
      : Promise.resolve({ data: [] as AgencyRef[] }),
  ]);

  const items = (itemsRes.data ?? []) as Proposal[];
  const agencyMap = new Map<string, AgencyRef>(
    ((agenciesRes.data ?? []) as AgencyRef[]).map((a) => [a.id, a]),
  );

  const teamIds = items
    .map((i) => i.team_id)
    .filter((id): id is string => !!id);

  const teamsRes = teamIds.length
    ? await admin
        .from("teams")
        .select("id, name, country, country_code, slug")
        .in("id", teamIds)
    : { data: [] as TeamRef[] };
  const teamMap = new Map<string, TeamRef>(
    ((teamsRes.data ?? []) as TeamRef[]).map((t) => [t.id, t]),
  );

  const data = submissions.map((s) => ({
    submission: {
      id: s.id,
      note: s.note,
      submittedAt: s.submitted_at,
    },
    agency: agencyMap.get(s.agency_id)
      ? {
          id: agencyMap.get(s.agency_id)!.id,
          name: agencyMap.get(s.agency_id)!.name,
          slug: agencyMap.get(s.agency_id)!.slug,
          logoUrl: agencyMap.get(s.agency_id)!.logo_url,
        }
      : null,
    items: items
      .filter((it) => it.submission_id === s.id)
      .map((it) => ({
        id: it.id,
        teamId: it.team_id,
        proposedTeamName: it.proposed_team_name,
        proposedTeamCountry: it.proposed_team_country,
        proposedTeamCountryCode: it.proposed_team_country_code,
        proposedTeamDivision: it.proposed_team_division,
        proposedTeamTransfermarktUrl: it.proposed_team_transfermarkt_url,
        relationKind: it.relation_kind,
        description: it.description,
        team: it.team_id
          ? teamMap.get(it.team_id)
            ? {
                id: teamMap.get(it.team_id)!.id,
                name: teamMap.get(it.team_id)!.name,
                country: teamMap.get(it.team_id)!.country,
                countryCode: teamMap.get(it.team_id)!.country_code,
                slug: teamMap.get(it.team_id)!.slug,
              }
            : null
          : null,
      })),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-bh-display text-2xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Solicitudes de equipos · Agencias
        </h1>
        <p className="mt-1 text-sm text-bh-fg-3 max-w-3xl">
          Las agencias proponen equipos con los que han trabajado. Aprobá ítem por ítem; los equipos nuevos se materializan en el directorio con estado &quot;pending&quot;.
        </p>
      </header>

      <AgencyTeamProposalsClient submissions={data} />
    </div>
  );
}
