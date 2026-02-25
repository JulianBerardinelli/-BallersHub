import { redirect } from "next/navigation";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import TaskCalloutList from "@/components/dashboard/client/TaskCalloutList";
import LockedSection from "@/components/dashboard/client/LockedSection";
import { fetchPlayerTaskMetrics } from "@/lib/dashboard/client/metrics";
import {
  buildTaskContext,
  getPendingTasksForSection,
  type TaskProfileSnapshot,
} from "@/lib/dashboard/client/task-context";
import { evaluateDashboardTasks, orderTasksBySeverity } from "@/lib/dashboard/client/tasks";
import {
  extractApplicationLinks,
  hydrateTaskProfileSnapshot,
  pickFirstPresent,
} from "@/lib/dashboard/client/profile-data";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolveDashboardAccess } from "@/lib/dashboard/client/permissions";
import { fetchDashboardPublishingState } from "@/lib/dashboard/client/publishing-state";
import ExternalLinksManager from "./components/ExternalLinksManager";
import HonoursManager from "./components/HonoursManager";
import SeasonStatsManager from "./components/SeasonStatsManager";
import SportProfileSection from "./components/SportProfileSection";
import MarketProjectionSection from "./components/MarketProjectionSection";
import CareerManager, {
  type CareerStage,
  type CareerRequestSnapshot,
  type CareerRequestStage,
} from "./components/CareerManager";
import type { LinkKind } from "./schemas";

type CareerItem = {
  id: string;
  club: string | null;
  division: string | null;
  start_date: string | null;
  end_date: string | null;
  team: {
    id: string | null;
    name: string | null;
    crest_url: string | null;
    country_code: string | null;
  } | null;
};

type PlayerApplicationSnapshot = {
  id: string;
  full_name: string | null;
  nationality: string[] | null;
  positions: string[] | null;
  current_club: string | null;
  transfermarkt_url: string | null;
  external_profile_url: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

type PlayerMediaItem = {
  id: string;
  type: "photo" | "video" | "doc";
  url: string;
  title: string | null;
  provider: string | null;
};

type CareerRevisionItemRow = {
  id: string;
  club: string | null;
  division: string | null;
  start_year: number | null;
  end_year: number | null;
  order_index: number | null;
  team: {
    id: string | null;
    name: string | null;
    crest_url: string | null;
    country_code: string | null;
  } | null;
  proposed_team: {
    id: string | null;
    name: string | null;
    country_code: string | null;
    country_name: string | null;
  } | null;
};

type CareerRevisionRequestRow = {
  id: string;
  status: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  change_summary: string | null;
  resolution_note: string | null;
  items: CareerRevisionItemRow[] | null;
};

export default async function FootballDataPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard/edit-profile/football-data");

  const dashboardState = await fetchDashboardState(supabase, user.id);

  const profileData = dashboardState.profile;
  const applicationData = dashboardState.application;

  const access = resolveDashboardAccess({
    profileStatus: profileData?.status ?? null,
    hasProfile: Boolean(profileData),
    applicationStatus: applicationData?.status ?? null,
  });

  if (!profileData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Datos futbolísticos"
          description="Creá tu perfil para gestionar trayectoria, estadísticas y enlaces deportivos."
        />
        {access.profileLock ? <LockedSection {...access.profileLock} /> : null}
      </div>
    );
  }

  if (access.profileLock) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Datos futbolísticos"
          description="Organizá toda tu información deportiva para construir un perfil completo y actualizado."
        />
        <LockedSection {...access.profileLock} />
      </div>
    );
  }

  const [careerResult, mediaResult, metrics, publishingState, revisionResult] = await Promise.all([
    supabase
      .from("career_items")
      .select(
        `id, club, division, start_date, end_date,
         team:teams!career_items_team_id_fkey ( id, name, crest_url, country_code )`
      )
      .eq("player_id", profileData.id)
      .order("start_date", { ascending: false }),
    supabase
      .from("player_media")
      .select("id, type, url, title, provider")
      .eq("player_id", profileData.id)
      .order("created_at", { ascending: true }),
    fetchPlayerTaskMetrics(supabase, profileData.id),
    fetchDashboardPublishingState(supabase, profileData.id),
    supabase
      .from("career_revision_requests")
      .select(
        `id, status, submitted_at, reviewed_at, change_summary, resolution_note,
         items:career_revision_items (
           id,
           club,
           division,
           start_year,
           end_year,
           order_index,
           team:teams!career_revision_items_team_id_fkey ( id, name, crest_url, country_code ),
           proposed_team:career_revision_proposed_teams!career_revision_items_proposed_team_id_fkey (
             id,
             name,
             country_code,
             country_name
           )
         )`
      )
      .eq("player_id", profileData.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle<CareerRevisionRequestRow>(),
  ]);

  const careerRaw = careerResult.data;
  const mediaRaw = mediaResult.data;

  const careerRows = (careerRaw as CareerItem[] | null) ?? [];
  const media = (mediaRaw as PlayerMediaItem[] | null) ?? [];

  const primaryHighlight = media.find((item) => item.type === "video") ?? null;

  const application: PlayerApplicationSnapshot | null = applicationData
    ? {
        id: applicationData.id,
        full_name: applicationData.full_name ?? null,
        nationality: applicationData.nationality ?? null,
        positions: applicationData.positions ?? null,
        current_club: applicationData.current_club ?? null,
        transfermarkt_url: applicationData.transfermarkt_url ?? null,
        external_profile_url: applicationData.external_profile_url ?? null,
        notes: applicationData.notes ?? null,
        status: applicationData.status ?? null,
        created_at: applicationData.created_at ?? null,
      }
    : null;

  const applicationLinks = extractApplicationLinks(application);

  const normalizedProfile: TaskProfileSnapshot = {
    id: profileData.id,
    status: profileData.status,
    slug: profileData.slug ?? null,
    visibility: profileData.visibility,
    full_name: profileData.full_name ?? null,
    birth_date: profileData.birth_date ?? null,
    nationality: profileData.nationality ?? null,
    positions: profileData.positions ?? null,
    current_club: profileData.current_club ?? null,
    bio: profileData.bio ?? null,
    avatar_url: profileData.avatar_url ?? dashboardState.primaryPhotoUrl ?? null,
    foot: profileData.foot ?? null,
    height_cm: profileData.height_cm ?? null,
    weight_kg: profileData.weight_kg ?? null,
  };

  const hydratedProfile =
    hydrateTaskProfileSnapshot(normalizedProfile, application ?? null) ?? normalizedProfile;

  const taskEvaluation = evaluateDashboardTasks(buildTaskContext(hydratedProfile, metrics));
  const pendingTasks = orderTasksBySeverity(getPendingTasksForSection(taskEvaluation, "football-data"));
  const taskCallouts = pendingTasks.map((task) => ({
    id: task.id,
    severity: task.severity,
    title: task.title,
    description: task.description,
    href: task.href,
  }));

  const positions = Array.isArray(hydratedProfile.positions)
    ? hydratedProfile.positions.join(", ")
    : "";
  const dominantFoot = hydratedProfile.foot ?? "";
  const currentClub = hydratedProfile.current_club ?? "";
  const marketValue = formatMarketValue(profileData.market_value_eur ?? null);
  const getLinkByKind = (kind: string) => publishingState.links.find((link) => link.kind === kind)?.url ?? null;

  const highlightUrl = pickFirstPresent(
    getLinkByKind("highlight"),
    primaryHighlight?.url ?? null,
    applicationLinks.youtube,
    applicationLinks.social,
  );
  const transfermarktUrl = pickFirstPresent(getLinkByKind("transfermarkt"), applicationLinks.transfermarkt);
  const besoccerUrl = pickFirstPresent(getLinkByKind("besoccer"), applicationLinks.besoccer);
  const youtubeUrl = pickFirstPresent(
    getLinkByKind("youtube"),
    applicationLinks.youtube,
    primaryHighlight?.url && /youtu(be|\.com)/i.test(primaryHighlight.url)
      ? primaryHighlight.url
      : null,
  );
  const instagramUrl = pickFirstPresent(
    getLinkByKind("instagram"),
    applicationLinks.instagram,
    applicationLinks.social && /instagram\.com/i.test(applicationLinks.social)
      ? applicationLinks.social
      : null,
  );
  const linkedinUrl = pickFirstPresent(
    getLinkByKind("linkedin"),
    applicationLinks.linkedin,
    applicationLinks.social && /linkedin\.com/i.test(applicationLinks.social)
      ? applicationLinks.social
      : null,
  );

  const linkSuggestions = {
    highlight: highlightUrl,
    transfermarkt: transfermarktUrl ?? null,
    besoccer: besoccerUrl ?? null,
    youtube: youtubeUrl ?? null,
    instagram: instagramUrl ?? null,
    linkedin: linkedinUrl ?? null,
  } satisfies Partial<Record<LinkKind, string | null>>;

  const careerStages: CareerStage[] = careerRows.map((item) => ({
    id: item.id,
    club: item.club,
    division: item.division,
    startYear: item.start_date ? safeYear(item.start_date) : null,
    endYear: item.end_date ? safeYear(item.end_date) : null,
    team: item.team
      ? {
          id: item.team.id ?? null,
          name: item.team.name ?? null,
          crestUrl: item.team.crest_url ?? null,
          countryCode: item.team.country_code ?? null,
        }
      : null,
  }));

  const careerSeasonOptions = careerStages.map((stage) => ({
    id: stage.id,
    label: describeCareerStage(stage),
    club: stage.team?.name ?? stage.club ?? "Club sin definir",
    period: describeCareerPeriod(stage),
    crestUrl: stage.team?.crestUrl ?? null,
  }));

  let latestRevision: CareerRequestSnapshot | null = null;
  if (!revisionResult.error && revisionResult.data) {
    const items: CareerRequestStage[] = Array.isArray(revisionResult.data.items)
      ? revisionResult.data.items
          .slice()
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((item) => ({
            id: item.id,
            club: item.club,
            division: item.division,
            startYear: item.start_year ?? null,
            endYear: item.end_year ?? null,
            team: item.team
              ? {
                  id: item.team.id ?? null,
                  name: item.team.name ?? null,
                  crestUrl: item.team.crest_url ?? null,
                  countryCode: item.team.country_code ?? null,
                }
              : null,
            proposedTeam: item.proposed_team
              ? {
                  name: item.proposed_team.name ?? null,
                  countryCode: item.proposed_team.country_code ?? null,
                  countryName: item.proposed_team.country_name ?? null,
                }
              : null,
          }))
      : [];

    latestRevision = {
      id: revisionResult.data.id,
      status: normalizeRequestStatus(revisionResult.data.status),
      submittedAt: revisionResult.data.submitted_at ?? null,
      reviewedAt: revisionResult.data.reviewed_at ?? null,
      note: revisionResult.data.change_summary ?? null,
      resolutionNote: revisionResult.data.resolution_note ?? null,
      items,
    };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Datos futbolísticos"
        description="Organizá toda tu información deportiva para construir un perfil completo y actualizado."
      />

      <TaskCalloutList tasks={taskCallouts} />

      <SportProfileSection
        playerId={profileData.id}
        initialValues={{
          positions,
          foot: dominantFoot,
          currentClub,
          contractStatus: profileData.contract_status ?? "",
        }}
      />

      <SectionCard
        title="Trayectoria"
        description="Gestioná tu historial deportivo y enviá cambios al equipo de Ballers para su validación."
      >
        <CareerManager
          playerId={profileData.id}
          playerName={profileData.full_name ?? null}
          stages={careerStages}
          latestRequest={latestRevision}
        />
      </SectionCard>

      <SectionCard
        title="Referencias y enlaces"
        description="Conectá tu perfil con plataformas externas para validar tu experiencia."
      >
        <ExternalLinksManager
          playerId={profileData.id}
          links={publishingState.links}
          suggestions={linkSuggestions}
        />
      </SectionCard>

      <SectionCard
        title="Palmarés y reconocimientos"
        description="Documentá títulos, premios individuales y estadísticas destacadas."
      >
        <HonoursManager
          playerId={profileData.id}
          honours={publishingState.honours}
          careerOptions={careerSeasonOptions}
        />
        <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
          <span className="rounded-full border border-neutral-800 px-3 py-1">🏆 Campeonatos</span>
          <span className="rounded-full border border-neutral-800 px-3 py-1">⭐ Premios individuales</span>
          <span className="rounded-full border border-neutral-800 px-3 py-1">📈 Estadísticas clave</span>
        </div>
      </SectionCard>

      <SectionCard
        title="Estadísticas por temporada"
        description="Seguimiento agregado de tus números oficiales para compartir con clubes y representantes."
      >
        <SeasonStatsManager
          playerId={profileData.id}
          stats={publishingState.stats}
          careerOptions={careerSeasonOptions}
        />
      </SectionCard>

      <MarketProjectionSection
        playerId={profileData.id}
        initialValues={{
          marketValue,
          careerObjectives: profileData.career_objectives ?? "",
        }}
      />
    </div>
  );
}

function safeYear(value: string): number | null {
  const year = new Date(value).getFullYear();
  return Number.isNaN(year) ? null : year;
}

function formatMarketValue(value: string | number | null): string {
  if (value === null || value === undefined) {
    return "";
  }

  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) {
    return "";
  }

  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(numeric);
}

function describeCareerStage(stage: CareerStage): string {
  const club = stage.team?.name ?? stage.club ?? "Club sin definir";
  const from = stage.startYear ?? "¿?";
  const to = stage.endYear ?? "Actual";
  const division = stage.division ? ` · ${stage.division}` : "";
  return `${club}${division} (${from} – ${to})`;
}

function describeCareerPeriod(stage: CareerStage): string {
  const from = stage.startYear ?? "¿?";
  const to = stage.endYear ?? "Actual";
  return `${from} – ${to}`;
}

function normalizeRequestStatus(status: string | null | undefined): CareerRequestSnapshot["status"] {
  if (status === "approved" || status === "rejected" || status === "cancelled") {
    return status;
  }
  return "pending";
}
