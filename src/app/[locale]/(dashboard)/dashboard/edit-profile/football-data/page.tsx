import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
import { db } from "@/lib/db";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolveDashboardAccess } from "@/lib/dashboard/client/permissions";
import { fetchDashboardPublishingState } from "@/lib/dashboard/client/publishing-state";
import SportProfileSection from "./components/SportProfileSection";
import AgencyRepresentationManager from "./components/AgencyRepresentationManager";
import CareerManager, {
  type CareerStage,
  type CareerRequestSnapshot,
  type CareerRequestStage,
} from "./components/CareerManager";

// Below-the-fold managers are heavy (~200–800 lines of client code
// each). They lazy-load via dedicated client wrappers in ./components/lazy/
// using `dynamic({ ssr: false })`. That keeps them out of the initial
// First Load JS — hydration on this route is dominated by these
// forms, so this is the single biggest reduction in /dashboard/edit-
// profile/football-data's bundle (~570 kB → lower).
import SeasonStatsManager from "./components/lazy/SeasonStatsManagerLazy";
import ExternalLinksManager from "./components/lazy/ExternalLinksManagerLazy";
import HonoursManager from "./components/lazy/HonoursManagerLazy";
import ScoutingAnalysisSection from "./components/lazy/ScoutingAnalysisSectionLazy";
import MarketProjectionSection from "./components/lazy/MarketProjectionSectionLazy";

import type { LinkKind } from "./schemas";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import { Lock } from "lucide-react";

type CareerItem = {
  id: string;
  club: string | null;
  division: string | null;
  division_id: string | null;
  // Texto libre + (opcional) id resuelto al catálogo. La columna texto
  // existe para mostrar la liga aunque no esté linkeada al catálogo.
  secondary_division: string | null;
  secondary_division_id: string | null;
  secondary_division_division: { id: string | null; name: string | null } | null;
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
  division_id: string | null;
  secondary_division: string | null;
  secondary_division_id: string | null;
  secondary_division_division: { id: string | null; name: string | null } | null;
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
  stats_items: { id: string }[] | null;
};

export default async function FootballDataPage() {
  const t = await getTranslations("dashboard");
  const te = await getTranslations("dashEditProfile");
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
          title={t("editProfile.footballDataTitle")}
          description={t("editProfile.footballDataNoProfileDescription")}
        />
        {access.profileLock ? <LockedSection {...access.profileLock} /> : null}
      </div>
    );
  }

  if (access.profileLock) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("editProfile.footballDataTitle")}
          description={t("editProfile.footballDataDescription")}
        />
        <LockedSection {...access.profileLock} />
      </div>
    );
  }

  const [careerResult, mediaResult, metrics, publishingState, revisionResult] = await Promise.all([
    supabase
      .from("career_items")
      .select(
        `id, club, division, start_date, end_date, division_id, secondary_division, secondary_division_id,
         team:teams!career_items_team_id_fkey ( id, name, crest_url, country_code ),
         secondary_division_division:divisions!career_items_secondary_division_id_divisions_id_fk ( id, name )`
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
           division_id,
           secondary_division,
           secondary_division_id,
           start_year,
           end_year,
           order_index,
           team:teams!career_revision_items_team_id_fkey ( id, name, crest_url, country_code ),
           proposed_team:career_revision_proposed_teams!career_revision_items_proposed_team_id_fkey (
             id,
             name,
             country_code,
             country_name
           ),
           secondary_division_division:divisions!career_revision_items_secondary_division_id_divisions_id_fk ( id, name )
         ),
         stats_items:stats_revision_items ( id )`
      )
      .eq("player_id", profileData.id)
      .order("submitted_at", { ascending: false })
      .limit(5)
      .returns<CareerRevisionRequestRow[]>(),
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
  // Link suggestions
  const highlightUrl = pickFirstPresent(
    getLinkByKind("highlight"),
    primaryHighlight?.url ?? null,
    applicationLinks.youtube,
    applicationLinks.social,
  );
  const transfermarktUrl = pickFirstPresent(getLinkByKind("transfermarkt"), applicationLinks.transfermarkt);
  const besoccerUrl = pickFirstPresent(getLinkByKind("besoccer"), applicationLinks.besoccer);
  const flashscoreUrl = pickFirstPresent(
    getLinkByKind("flashscore"),
    applicationLinks.social && /flashscore/i.test(applicationLinks.social)
      ? applicationLinks.social
      : null,
  );
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
    flashscore: flashscoreUrl ?? null,
    youtube: youtubeUrl ?? null,
    instagram: instagramUrl ?? null,
    linkedin: linkedinUrl ?? null,
  } satisfies Partial<Record<LinkKind, string | null>>;

  const careerStages: CareerStage[] = careerRows.map((item) => ({
    id: item.id,
    club: item.club,
    division: item.division,
    division_id: item.division_id,
    secondaryDivisionId: item.secondary_division_id ?? null,
    // Preferimos el texto libre (cubre el caso "Preferente FFIB" que no
    // está en el catálogo). Si está vacío, fallback al nombre del join.
    secondaryDivisionName: item.secondary_division ?? item.secondary_division_division?.name ?? null,
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

  const careerLabelFallbacks = {
    clubUndefined: te("footballData.seasonStats.clubUndefined"),
    currentPeriod: te("footballData.career.currentPeriod"),
  };
  const careerSeasonOptions = careerStages.map((stage) => ({
    id: stage.id,
    label: describeCareerStage(stage, careerLabelFallbacks),
    club: stage.team?.name ?? stage.club ?? careerLabelFallbacks.clubUndefined,
    period: describeCareerPeriod(stage, careerLabelFallbacks),
    crestUrl: stage.team?.crestUrl ?? null,
  }));

  // A single career_revision_request can hold career_revision_items, stats_revision_items,
  // or both. We split into two snapshots so each panel (Trayectoria / Estadísticas)
  // shows the resolution_note of its own latest applicable request.
  let latestCareerRevision: CareerRequestSnapshot | null = null;
  let latestStatsRevision: CareerRequestSnapshot | null = null;
  const revisionRows = !revisionResult.error && Array.isArray(revisionResult.data)
    ? revisionResult.data
    : [];

  const buildSnapshot = (row: CareerRevisionRequestRow): CareerRequestSnapshot => {
    const items: CareerRequestStage[] = Array.isArray(row.items)
      ? row.items
          .slice()
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((item) => ({
            id: item.id,
            club: item.club,
            division: item.division,
            division_id: item.division_id,
            secondaryDivisionId: item.secondary_division_id ?? null,
            secondaryDivisionName:
              item.secondary_division ?? item.secondary_division_division?.name ?? null,
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
    return {
      id: row.id,
      status: normalizeRequestStatus(row.status),
      submittedAt: row.submitted_at ?? null,
      reviewedAt: row.reviewed_at ?? null,
      note: row.change_summary ?? null,
      resolutionNote: row.resolution_note ?? null,
      items,
    };
  };

  for (const row of revisionRows) {
    const hasCareerItems = Array.isArray(row.items) && row.items.length > 0;
    const hasStatsItems = Array.isArray(row.stats_items) && row.stats_items.length > 0;
    if (!latestCareerRevision && hasCareerItems) {
      latestCareerRevision = buildSnapshot(row);
    }
    if (!latestStatsRevision && hasStatsItems) {
      latestStatsRevision = buildSnapshot(row);
    }
    if (latestCareerRevision && latestStatsRevision) break;
  }

  // NOTE: Profile state loader is required to fetch extra custom columns when not in basic snapshot
  const { data: rawProfileRow } = await supabase
    .from("player_profiles")
    .select("agency_id, top_characteristics, tactics_analysis, physical_analysis, mental_analysis, technique_analysis, analysis_author")
    .eq("id", profileData.id)
    .single();

  const agencyInfo = rawProfileRow?.agency_id
    ? await db.query.agencyProfiles.findFirst({
        where: (agencies, { eq }) => eq(agencies.id, rawProfileRow.agency_id as string),
        columns: {
          id: true,
          name: true,
          logoUrl: true,
        }
      })
    : null;

  const planAccess = resolvePlanAccess(dashboardState.subscription);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("editProfile.footballDataTitle")}
        description={t("editProfile.footballDataDescription")}
      />

      <TaskCalloutList tasks={taskCallouts} />

      <AgencyRepresentationManager agency={agencyInfo || null} />

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
        title={t("editProfile.careerHistoryTitle")}
        description={t("editProfile.careerHistoryDescription")}
      >
        <CareerManager
          playerId={profileData.id}
          playerName={profileData.full_name ?? null}
          stages={careerStages}
          latestRequest={latestCareerRevision}
        />
      </SectionCard>

      <SectionCard
        title={t("editProfile.seasonStatsTitle")}
        description={t("editProfile.seasonStatsDescription")}
      >
        <SeasonStatsManager
          playerId={profileData.id}
          stats={publishingState.stats}
          careerOptions={careerSeasonOptions}
          latestRequest={latestStatsRevision}
        />
      </SectionCard>

      <SectionCard
        title={t("editProfile.referencesLinksTitle")}
        description={t("editProfile.referencesLinksDescription")}
      >
        <ExternalLinksManager
          playerId={profileData.id}
          links={publishingState.links}
          suggestions={linkSuggestions}
        />
      </SectionCard>

      <SectionCard
        title={
          <span className="inline-flex items-center gap-2">
            {t("editProfile.honoursTitle")}
            {!planAccess.isPro && (
              <span className="inline-flex items-center gap-1 rounded-full border border-bh-lime/40 bg-bh-lime/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-bh-lime">
                <Lock size={9} /> Pro
              </span>
            )}
          </span>
        }
        description={
          planAccess.isPro
            ? t("editProfile.honoursDescriptionPro")
            : t("editProfile.honoursDescriptionFree")
        }
      >
        <HonoursManager
          playerId={profileData.id}
          honours={publishingState.honours}
          careerOptions={careerSeasonOptions}
        />
        <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
          <span className="rounded-full border border-neutral-800 px-3 py-1">🏆 {t("editProfile.honoursChipChampionships")}</span>
          <span className="rounded-full border border-neutral-800 px-3 py-1">⭐ {t("editProfile.honoursChipIndividualAwards")}</span>
          <span className="rounded-full border border-neutral-800 px-3 py-1">📈 {t("editProfile.honoursChipKeyStats")}</span>
        </div>
      </SectionCard>

      <ScoutingAnalysisSection
        playerId={profileData.id}
        initialValues={{
          topCharacteristics: (rawProfileRow?.top_characteristics as string[])?.join(", ") ?? "",
          tacticsAnalysis: rawProfileRow?.tactics_analysis ?? "",
          physicalAnalysis: rawProfileRow?.physical_analysis ?? "",
          mentalAnalysis: rawProfileRow?.mental_analysis ?? "",
          techniqueAnalysis: rawProfileRow?.technique_analysis ?? "",
          analysisAuthor: rawProfileRow?.analysis_author ?? "",
        }}
      />

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
  const year = new Date(value).getUTCFullYear();
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

function describeCareerStage(
  stage: CareerStage,
  labels: { clubUndefined: string; currentPeriod: string },
): string {
  const club = stage.team?.name ?? stage.club ?? labels.clubUndefined;
  const from = stage.startYear ?? "¿?";
  const to = stage.endYear ?? labels.currentPeriod;
  const division = stage.division ? ` · ${stage.division}` : "";
  return `${club}${division} (${from} – ${to})`;
}

function describeCareerPeriod(
  stage: CareerStage,
  labels: { currentPeriod: string },
): string {
  const from = stage.startYear ?? "¿?";
  const to = stage.endYear ?? labels.currentPeriod;
  return `${from} – ${to}`;
}

function normalizeRequestStatus(status: string | null | undefined): CareerRequestSnapshot["status"] {
  if (status === "approved" || status === "rejected" || status === "cancelled") {
    return status;
  }
  return "pending";
}
