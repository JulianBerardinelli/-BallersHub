import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export type DashboardThemeSettings = {
  layout: string;
  primaryColor: string | null;
  accentColor: string | null;
  typography: string | null;
  coverMode: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DashboardSectionVisibility = {
  id: string;
  section: string;
  visible: boolean;
  settings: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DashboardExternalLink = {
  id: string;
  label: string | null;
  url: string;
  kind: string;
  isPrimary: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DashboardHonour = {
  id: string;
  title: string;
  competition: string | null;
  season: string | null;
  awardedOn: string | null;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  careerItemId: string | null;
};

export type DashboardSeasonStat = {
  id: string;
  season: string;
  competition: string | null;
  team: string | null;
  matches: number | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  yellowCards: number | null;
  redCards: number | null;
  createdAt: string | null;
  careerItemId: string | null;
};

export type DashboardPublishingState = {
  playerId: string;
  theme: DashboardThemeSettings | null;
  sections: DashboardSectionVisibility[];
  links: DashboardExternalLink[];
  honours: DashboardHonour[];
  stats: DashboardSeasonStat[];
};

type PublishingStateRow = {
  player_id: string;
  theme_settings: Record<string, unknown> | null;
  sections: Array<Record<string, unknown>> | null;
  links: Array<Record<string, unknown>> | null;
  honours: Array<Record<string, unknown>> | null;
  stats: Array<Record<string, unknown>> | null;
};

export async function fetchDashboardPublishingState(
  supabase: AnySupabaseClient,
  playerId: string,
): Promise<DashboardPublishingState> {
  const { data, error } = await supabase
    .from("player_dashboard_publishing_state")
    .select("player_id, theme_settings, sections, links, honours, stats")
    .eq("player_id", playerId)
    .maybeSingle<PublishingStateRow>();

  if (error) {
    if (isMissingSchemaEntity(error)) {
      return fetchPublishingStateFromBaseTables(supabase, playerId);
    }

    throw error;
  }

  if (!data) {
    return emptyPublishingState(playerId);
  }

  return mapPublishingStateRow(data);
}

function emptyPublishingState(playerId: string): DashboardPublishingState {
  return {
    playerId,
    theme: null,
    sections: [],
    links: [],
    honours: [],
    stats: [],
  };
}

function mapPublishingStateRow(row: PublishingStateRow): DashboardPublishingState {
  return {
    playerId: row.player_id,
    theme: row.theme_settings ? mapThemeSettings(row.theme_settings) : null,
    sections: Array.isArray(row.sections) ? row.sections.map(mapSectionVisibility).filter(Boolean) : [],
    links: Array.isArray(row.links) ? row.links.map(mapExternalLink).filter(Boolean) : [],
    honours: Array.isArray(row.honours) ? row.honours.map(mapHonour).filter(Boolean) : [],
    stats: Array.isArray(row.stats) ? row.stats.map(mapSeasonStat).filter(Boolean) : [],
  };
}

function mapThemeSettings(input: Record<string, unknown>): DashboardThemeSettings {
  return {
    layout: typeof input.layout === "string" ? input.layout : "classic",
    primaryColor: (typeof input.primary_color === "string" ? input.primary_color : null),
    accentColor: (typeof input.accent_color === "string" ? input.accent_color : null),
    typography: (typeof input.typography === "string" ? input.typography : null),
    coverMode: (typeof input.cover_mode === "string" ? input.cover_mode : null),
    createdAt: typeof input.created_at === "string" ? input.created_at : null,
    updatedAt: typeof input.updated_at === "string" ? input.updated_at : null,
  };
}

function mapSectionVisibility(input: Record<string, unknown>): DashboardSectionVisibility | null {
  const id = typeof input.id === "string" ? input.id : null;
  const section = typeof input.section === "string" ? input.section : null;
  if (!id || !section) return null;

  return {
    id,
    section,
    visible: typeof input.visible === "boolean" ? input.visible : true,
    settings: typeof input.settings === "object" && input.settings !== null ? (input.settings as Record<string, unknown>) : null,
    createdAt: typeof input.created_at === "string" ? input.created_at : null,
    updatedAt: typeof input.updated_at === "string" ? input.updated_at : null,
  };
}

function mapExternalLink(input: Record<string, unknown>): DashboardExternalLink | null {
  const id = typeof input.id === "string" ? input.id : null;
  const url = typeof input.url === "string" ? input.url : null;
  const kind = typeof input.kind === "string" ? input.kind : null;
  if (!id || !url || !kind) return null;

  return {
    id,
    label: typeof input.label === "string" ? input.label : null,
    url,
    kind,
    isPrimary: typeof input.is_primary === "boolean" ? input.is_primary : false,
    metadata:
      typeof input.metadata === "object" && input.metadata !== null
        ? (input.metadata as Record<string, unknown>)
        : null,
    createdAt: typeof input.created_at === "string" ? input.created_at : null,
    updatedAt: typeof input.updated_at === "string" ? input.updated_at : null,
  };
}

function mapHonour(input: Record<string, unknown>): DashboardHonour | null {
  const id = typeof input.id === "string" ? input.id : null;
  const title = typeof input.title === "string" ? input.title : null;
  if (!id || !title) return null;

  return {
    id,
    title,
    competition: typeof input.competition === "string" ? input.competition : null,
    season: typeof input.season === "string" ? input.season : null,
    awardedOn: typeof input.awarded_on === "string" ? input.awarded_on : null,
    description: typeof input.description === "string" ? input.description : null,
    createdAt: typeof input.created_at === "string" ? input.created_at : null,
    updatedAt: typeof input.updated_at === "string" ? input.updated_at : null,
    careerItemId: typeof input.career_item_id === "string" ? input.career_item_id : null,
  };
}

function mapSeasonStat(input: Record<string, unknown>): DashboardSeasonStat | null {
  const id = typeof input.id === "string" ? input.id : null;
  const season = typeof input.season === "string" ? input.season : null;
  if (!id || !season) return null;

  return {
    id,
    season,
    competition: typeof input.competition === "string" ? input.competition : null,
    team: typeof input.team === "string" ? input.team : null,
    matches: typeof input.matches === "number" ? input.matches : null,
    minutes: typeof input.minutes === "number" ? input.minutes : null,
    goals: typeof input.goals === "number" ? input.goals : null,
    assists: typeof input.assists === "number" ? input.assists : null,
    yellowCards: typeof input.yellow_cards === "number" ? input.yellow_cards : null,
    redCards: typeof input.red_cards === "number" ? input.red_cards : null,
    createdAt: typeof input.created_at === "string" ? input.created_at : null,
    careerItemId: typeof input.career_item_id === "string" ? input.career_item_id : null,
  };
}

function isMissingSchemaEntity(error: PostgrestError | null): boolean {
  return Boolean(error?.code === "PGRST205");
}

type ThemeRow = {
  player_id: string;
  layout: string | null;
  primary_color: string | null;
  accent_color: string | null;
  typography: string | null;
  cover_mode: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type SectionRow = {
  id: string;
  section: string;
  visible: boolean | null;
  settings: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type LinkRow = {
  id: string;
  label: string | null;
  url: string;
  kind: string;
  is_primary: boolean | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type HonourRow = {
  id: string;
  title: string;
  competition: string | null;
  season: string | null;
  awarded_on: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
  career_item_id: string | null;
};

type StatRow = {
  id: string;
  season: string;
  competition: string | null;
  team: string | null;
  matches: number | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  created_at: string | null;
  career_item_id: string | null;
};

async function fetchPublishingStateFromBaseTables(
  supabase: AnySupabaseClient,
  playerId: string,
): Promise<DashboardPublishingState> {
  const [themeResult, sectionsResult, linksResult, honoursResult, statsResult] = await Promise.all([
    supabase.from("profile_theme_settings").select("*").eq("player_id", playerId).maybeSingle<ThemeRow>(),
    supabase
      .from("profile_sections_visibility")
      .select("id, section, visible, settings, created_at, updated_at")
      .eq("player_id", playerId)
      .order("section", { ascending: true })
      .returns<SectionRow[]>(),
    supabase
      .from("player_links")
      .select("id, label, url, kind, is_primary, metadata, created_at, updated_at")
      .eq("player_id", playerId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<LinkRow[]>(),
    supabase
      .from("player_honours")
      .select(
        "id, title, competition, season, awarded_on, description, created_at, updated_at, career_item_id",
      )
      .eq("player_id", playerId)
      .order("awarded_on", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .returns<HonourRow[]>(),
    supabase
      .from("stats_seasons")
      .select(
        "id, season, competition, team, matches, minutes, goals, assists, yellow_cards, red_cards, created_at, career_item_id",
      )
      .eq("player_id", playerId)
      .order("season", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<StatRow[]>(),
  ]);

  if (themeResult.error) throw themeResult.error;
  if (sectionsResult.error) throw sectionsResult.error;
  if (linksResult.error) throw linksResult.error;
  if (honoursResult.error) throw honoursResult.error;
  if (statsResult.error) throw statsResult.error;

  const theme = themeResult.data ? mapThemeSettings(themeResult.data) : null;
  const sections = (sectionsResult.data ?? [])
    .map((section) => mapSectionVisibility(section))
    .filter(Boolean) as DashboardSectionVisibility[];
  const links = (linksResult.data ?? [])
    .map((link) => mapExternalLink(link))
    .filter(Boolean) as DashboardExternalLink[];
  const honours = (honoursResult.data ?? [])
    .map((honour) => mapHonour(honour))
    .filter(Boolean) as DashboardHonour[];
  const stats = (statsResult.data ?? [])
    .map((stat) => mapSeasonStat(stat))
    .filter(Boolean) as DashboardSeasonStat[];

  return {
    playerId,
    theme,
    sections,
    links,
    honours,
    stats,
  };
}
