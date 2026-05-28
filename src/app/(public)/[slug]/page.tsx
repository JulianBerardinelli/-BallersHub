import { notFound } from "next/navigation";
import type { Metadata, Viewport } from "next";
import { cache } from "react";
import { db } from "@/lib/db";
import {
  playerMedia,
  careerItems,
  statsSeasons,
  playerArticles,
  playerLinks,
  teams,
  divisions,
  playerProfiles,
  profileThemeSettings,
} from "@/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import LayoutResolver from "./components/LayoutResolver";
import type {
  FreeLayoutCareerRow,
  FreeLayoutLink,
  FreeLayoutPersonal,
  FreeLayoutVideo,
} from "./components/free/FreeLayout";
import { PersonJsonLd } from "@/lib/seo/personJsonLd";
import { getAuthorHubSlugForUser } from "@/lib/seo/cross-ref";
import { formatPlayerPositions } from "@/lib/format";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";

// Public portfolios are cached for an hour. Crawlers hit these
// frequently and we don't need second-by-second freshness — the
// player's own dashboard mutations should `revalidatePath('/<slug>')`
// on save (TODO once the edit flow is wired up to do so).
//
// The previous `revalidate = 0` flag was a dev convenience that leaked
// into the repo and was forcing the SSR path to skip caching entirely,
// re-querying Postgres on every bot hit.
export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

/**
 * Lee el background color del theme del jugador (configurable desde el
 * dashboard del propio jugador en /dashboard/edit-template). Se usa para
 * pintar la barra de URL / status bar mobile via `<meta name="theme-color">`,
 * de modo que la chrome del navegador (Safari iOS y Chrome Android) se
 * integra con el fondo del portfolio en vez de salir gris/blanco por defecto.
 *
 * Cached con `react.cache` para que `generateMetadata`, `generateViewport` y
 * el render principal compartan el mismo SELECT en cada request.
 */
const getPlayerThemeColor = cache(async (slug: string): Promise<string> => {
  const fallback = "#050505";
  try {
    const rows = await db
      .select({ bg: profileThemeSettings.backgroundColor })
      .from(playerProfiles)
      .leftJoin(
        profileThemeSettings,
        eq(profileThemeSettings.playerId, playerProfiles.id),
      )
      .where(
        and(
          eq(playerProfiles.slug, slug),
          eq(playerProfiles.visibility, "public"),
          eq(playerProfiles.status, "approved"),
        ),
      )
      .limit(1);
    return rows[0]?.bg ?? fallback;
  } catch {
    return fallback;
  }
});

/**
 * `generateViewport` (Next 15 App Router) emite las meta tags `theme-color` y
 * `viewport` por página. Acá usamos el background del theme del jugador, que
 * iOS Safari pinta detrás de la URL bar (efecto inmersivo: la barra se mimetiza
 * con el hero en lugar de ser una franja gris/blanca encima del contenido).
 */
export async function generateViewport({ params }: { params: Params }): Promise<Viewport> {
  const { slug } = await params;
  const bg = await getPlayerThemeColor(slug);
  return {
    themeColor: bg,
    // En iOS standalone PWA, este modo deja el status bar transparente para
    // que el contenido pase por debajo. En navegador normal no aplica pero
    // tampoco hace daño.
    colorScheme: "dark",
  };
}

/**
 * Build a SEO-rich title + description from the player's public data.
 *
 * Strategy:
 *   • Title pattern: `Julian Berardinelli — Mediocampista · Boca Juniors`
 *     (name first, then position, then current club). Long-tail
 *     queries like "Julian Berardinelli mediocampista" match.
 *   • Description: use full bio when present (capped at 158 chars
 *     ending at a word boundary, not mid-word). Falls back to a
 *     composed sentence using whatever fields exist.
 */
function buildSeoTitle(p: {
  fullName: string;
  positions: string[] | null;
  currentClub: string | null;
}): string {
  const parts: string[] = [p.fullName];
  const pos = p.positions && p.positions.length > 0 ? formatPlayerPositions(p.positions) : null;
  if (pos) parts.push(pos);
  if (p.currentClub) parts.push(p.currentClub);
  return parts.join(" — ");
}

function buildSeoDescription(p: {
  fullName: string;
  bio: string | null;
  positions: string[] | null;
  currentClub: string | null;
  nationality: string[] | null;
}): string {
  if (p.bio && p.bio.trim().length > 0) {
    const clean = p.bio.replace(/\s+/g, " ").trim();
    if (clean.length <= 158) return clean;
    // Trim at last word boundary before 158 chars.
    const cut = clean.slice(0, 158);
    const lastSpace = cut.lastIndexOf(" ");
    return `${cut.slice(0, lastSpace > 0 ? lastSpace : 158)}…`;
  }
  const segments: string[] = [`Perfil profesional de ${p.fullName}`];
  if (p.positions && p.positions.length > 0) segments.push(formatPlayerPositions(p.positions));
  if (p.currentClub) segments.push(p.currentClub);
  if (p.nationality && p.nationality.length > 0) segments.push(p.nationality.join(" / "));
  return `${segments.join(" — ")}. Trayectoria, estadísticas, galería y contacto en 'BallersHub.`;
}

// Below this bio length we soft-noindex Free portfolios so thin profiles
// don't drag the whole site quality score. Pro portfolios are always
// indexable — they pay for the SERP slot. See seo-strategy.md §5 Track C.
const FREE_BIO_INDEX_MIN_CHARS = 100;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const player = await db.query.playerProfiles.findFirst({
    where: (p, { and, eq }) =>
      and(eq(p.slug, slug), eq(p.visibility, "public"), eq(p.status, "approved")),
    columns: {
      userId: true,
      fullName: true,
      bio: true,
      positions: true,
      avatarUrl: true,
      currentClub: true,
      nationality: true,
    },
  });
  if (!player) {
    return {
      title: "Jugador no encontrado",
      robots: { index: false, follow: false },
    };
  }

  // Resolve Pro vs Free to decide whether thin Free profiles should be
  // noindexed. We only run the subscription query when the bio is
  // actually short — common case is "bio is fine, no extra query".
  const bioLen = player.bio?.trim().length ?? 0;
  let softNoindex = false;
  if (bioLen < FREE_BIO_INDEX_MIN_CHARS) {
    const sub = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.userId, player.userId),
      columns: {
        plan: true,
        planId: true,
        status: true,
        statusV2: true,
        processor: true,
        processorSubscriptionId: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    });
    const planAccess = resolvePlanAccess(
      sub
        ? {
            plan: sub.plan,
            planId: sub.planId,
            status: sub.status,
            statusV2: sub.statusV2,
            processor: sub.processor,
            processorSubscriptionId: sub.processorSubscriptionId,
            currentPeriodEnd: sub.currentPeriodEnd
              ? sub.currentPeriodEnd.toISOString()
              : null,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
            trialEndsAt: null,
            canceledAt: null,
          }
        : null,
    );
    softNoindex = planAccess.isFree;
  }

  const title = buildSeoTitle(player);
  const description = buildSeoDescription(player);
  const canonical = `/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    ...(softNoindex && { robots: { index: false, follow: true } }),
    openGraph: {
      title,
      description,
      url: canonical,
      type: "profile",
      siteName: "'BallersHub",
      locale: "es_AR",
      images: player.avatarUrl
        ? [{ url: player.avatarUrl, alt: player.fullName }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: player.avatarUrl ? [player.avatarUrl] : undefined,
    },
  };
}

export default async function PlayerPublicPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: Promise<{ force_free?: string }>;
}) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};

  // 1) Jugador público
  const player = await db.query.playerProfiles.findFirst({
    where: (p, { and, eq }) =>
      and(
        eq(p.slug, slug),
        eq(p.visibility, "public"),
        eq(p.status, "approved"),
      ),
    with: {
      agency: true,
    },
  });

  if (!player) return notFound();

  // 2) Plan y límites (Para limitar fotos - o enviarlo completo y limitar ahi)
  //    IMPORTANTE: usamos resolvePlanAccess (mira statusV2 + plan_id) y NO
  //    `subscriptions.plan` directo. La column `plan` legacy lagea cuando hay
  //    grants admin / fixes parciales — ver plan-access.ts.
  const sub = await db.query.subscriptions.findFirst({
    where: (s, { eq }) => eq(s.userId, player.userId),
    columns: {
      plan: true,
      planId: true,
      status: true,
      statusV2: true,
      processor: true,
      processorSubscriptionId: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      limitsJson: true,
    }
  });
  const limits = (sub?.limitsJson ?? {}) as Record<string, unknown>;
  const maxPhotos = Number(limits?.max_photos ?? 100);
  const maxVideos = Number(limits?.max_videos ?? 100);

  const planAccess = resolvePlanAccess(
    sub
      ? {
          plan: sub.plan,
          planId: sub.planId,
          status: sub.status,
          statusV2: sub.statusV2,
          processor: sub.processor,
          processorSubscriptionId: sub.processorSubscriptionId,
          currentPeriodEnd: sub.currentPeriodEnd
            ? sub.currentPeriodEnd.toISOString()
            : null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
          trialEndsAt: null,
          canceledAt: null,
        }
      : null,
  );

  // DEV-ONLY override so we can preview the Free layout on any /[slug]
  // without flipping subscriptions in the DB. Trips on `?force_free=1`
  // and only when NODE_ENV !== 'production'. Strips itself in prod.
  const devForceFree =
    process.env.NODE_ENV !== "production" && sp.force_free === "1";

  // Subscription-driven plan. We then optionally downgrade to "free" below
  // based on the user's `profile_theme_settings.layout` choice — Pro users
  // are allowed to opt into the Free editorial dossier.
  // `planAccess.effectivePlan` is "free" | "pro" (pro_plus collapses to pro
  // at the access layer); narrow with that union to keep the comparisons
  // below honest under strict mode.
  const subscriptionPlan: "free" | "pro" = devForceFree
    ? "free"
    : planAccess.effectivePlan;

  // 3) Bandeja de Datos Públicos
  const [
    rawMedia,
    theme,
    sections,
    articles,
    personalRow,
    careerRows,
    statsRows,
    rawLinks,
  ] = await Promise.all([
      db
        .select()
        .from(playerMedia)
        .where(
          and(
            eq(playerMedia.playerId, player.id),
            eq(playerMedia.isApproved, true),
          ),
        ),
      db.query.profileThemeSettings.findFirst({
        where: (t, { eq }) => eq(t.playerId, player.id),
      }),
      db.query.profileSectionsVisibility.findMany({
        where: (s, { eq }) => eq(s.playerId, player.id),
      }),
      db
        .select()
        .from(playerArticles)
        .where(eq(playerArticles.playerId, player.id))
        .orderBy(desc(playerArticles.publishedAt)),
      // Free layout needs personal + career + stats + links. Cheaper to
      // fetch them unconditionally than to gate behind `isFree` and
      // refetch later if the plan check resolves differently.
      db.query.playerPersonalDetails.findFirst({
        where: (p, { eq }) => eq(p.playerId, player.id),
      }),
      db
        .select()
        .from(careerItems)
        .where(eq(careerItems.playerId, player.id))
        .orderBy(desc(careerItems.startDate)),
      db
        .select()
        .from(statsSeasons)
        .where(eq(statsSeasons.playerId, player.id)),
      db
        .select()
        .from(playerLinks)
        .where(eq(playerLinks.playerId, player.id)),
    ]);

  // Effective layout decision. `theme.layout` is the user's explicit
  // choice from the dashboard styles manager — values are "free" or
  // "pro" (newer) or legacy "classic"/"futuristic"/etc.
  //
  // Rules:
  //   • theme.layout === "free" → render Free (even if user has Pro
  //     subscription, they may want the simpler editorial dossier).
  //   • Free subscription → always Free (can't unlock Pro).
  //   • Otherwise → respect the subscription's effective plan.
  //
  // This is also what gates `freeData` below — keep it in sync.
  const themeLayoutChoice = (theme?.layout as string | null | undefined) ?? null;
  const subscriptionAllowsPro = subscriptionPlan === "pro";
  const plan: "free" | "pro" | "pro_plus" =
    themeLayoutChoice === "free" || !subscriptionAllowsPro
      ? "free"
      : subscriptionPlan;
  const isFree = plan === "free";

  // Resolve teams + divisions for career rows (and the player's current
  // club) in one shot so the Free layout can show real crests/flags.
  const teamIdSet = new Set<string>();
  for (const c of careerRows) if (c.teamId) teamIdSet.add(c.teamId);
  if (player.currentTeamId) teamIdSet.add(player.currentTeamId);

  const teamRows = teamIdSet.size
    ? await db.select().from(teams).where(inArray(teams.id, Array.from(teamIdSet)))
    : [];
  const teamById = new Map(teamRows.map((t) => [t.id, t]));

  // Cada career_item tiene su propia división (la del momento que el jugador
  // disputó esa etapa). NO usamos team.divisionId como fallback acá — el team
  // pudo cambiar de liga, pero la trayectoria es un snapshot histórico. El
  // único caso donde team.divisionId vale es el header del jugador (división
  // "actual"), que se resuelve más abajo via player.currentTeamId.
  const divisionIdSet = new Set<string>();
  for (const c of careerRows) {
    if (c.divisionId) divisionIdSet.add(c.divisionId);
    if (c.secondaryDivisionId) divisionIdSet.add(c.secondaryDivisionId);
  }
  if (player.currentTeamId) {
    const currentTeamRow = teamById.get(player.currentTeamId);
    if (currentTeamRow?.divisionId) divisionIdSet.add(currentTeamRow.divisionId);
  }

  const divisionRows = divisionIdSet.size
    ? await db
        .select()
        .from(divisions)
        .where(inArray(divisions.id, Array.from(divisionIdSet)))
    : [];
  const divisionById = new Map(divisionRows.map((d) => [d.id, d]));

  // Order videos in the Pro layout so the most recent season appears first
  // (NULL season_year sinks to the bottom). Primary stays on top, and within
  // the same year we fall back to upload recency. Keep this in sync with the
  // Free-layout video sort below.
  const sortedVideos = rawMedia
    .filter((m) => m.type === "video")
    .slice()
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      const ay = a.seasonYear ?? null;
      const by = b.seasonYear ?? null;
      if (ay !== by) {
        if (ay == null) return 1;
        if (by == null) return -1;
        return by - ay;
      }
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    });

  const media = [
    ...rawMedia.filter((m) => m.type === "photo").slice(0, maxPhotos),
    ...sortedVideos.slice(0, maxVideos),
  ];

  // Aggregate per-career stats so the free layout can render the
  // PJ/TIT/MIN/G/A row per club. statsSeasons rows can be many per
  // career_item — sum across rows that share a career_item_id.
  const statsByCareerId = new Map<
    string,
    { matches: number; starts: number; minutes: number; goals: number; assists: number }
  >();
  for (const s of statsRows) {
    if (!s.careerItemId) continue;
    const acc =
      statsByCareerId.get(s.careerItemId) ?? {
        matches: 0,
        starts: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
      };
    acc.matches += s.matches ?? 0;
    acc.starts += s.starts ?? 0;
    acc.minutes += s.minutes ?? 0;
    acc.goals += s.goals ?? 0;
    acc.assists += s.assists ?? 0;
    statsByCareerId.set(s.careerItemId, acc);
  }

  const freeCareer: FreeLayoutCareerRow[] = careerRows.map((c) => {
    const startYear = c.startDate ? new Date(c.startDate).getFullYear() : null;
    const endYear = c.endDate ? new Date(c.endDate).getFullYear() : null;
    const team = c.teamId ? teamById.get(c.teamId) : null;
    // Solo usamos la división del career_item — la del team puede haber
    // cambiado y no representa la etapa real del jugador.
    const division = c.divisionId ? divisionById.get(c.divisionId) : null;
    const secondaryDivision = c.secondaryDivisionId
      ? divisionById.get(c.secondaryDivisionId)
      : null;
    return {
      id: c.id,
      club: team?.name ?? c.club,
      countryCode: team?.countryCode ?? null,
      divisionName: division?.name ?? c.division ?? null,
      divisionCrestUrl: division?.crestUrl ?? null,
      // Si la secundaria está linkeada al catálogo, usamos el nombre +
      // crest del catálogo. Si no, mostramos el texto libre que el jugador
      // cargó (caso "Preferente FFIB" sin entry en divisions todavía).
      secondaryDivisionName: secondaryDivision?.name ?? c.secondaryDivision ?? null,
      secondaryDivisionCrestUrl: secondaryDivision?.crestUrl ?? null,
      teamCrestUrl: team?.crestUrl ?? null,
      startYear,
      endYear,
      isCurrent: !c.endDate,
      stats: statsByCareerId.get(c.id) ?? null,
    };
  });

  const currentTeam = player.currentTeamId
    ? teamById.get(player.currentTeamId) ?? null
    : null;
  const currentDivision = currentTeam?.divisionId
    ? divisionById.get(currentTeam.divisionId) ?? null
    : null;

  const freeLinks: FreeLayoutLink[] = rawLinks
    .filter((l) => !!l.url)
    .map((l) => ({
      kind: l.kind,
      url: l.url,
      label: l.label ?? null,
    }));

  // Free plan = 1 video. Prefer the approved isPrimary video, then the most
  // recent season_year (DESC, nulls last), then the most recently uploaded
  // approved video. If the player has no video in player_media, fall back
  // to a `kind=highlight` URL from player_links.
  const videos = rawMedia.filter((m) => m.type === "video" && m.isApproved);
  videos.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    const ay = a.seasonYear ?? null;
    const by = b.seasonYear ?? null;
    if (ay !== by) {
      if (ay == null) return 1;
      if (by == null) return -1;
      return by - ay;
    }
    const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bd - ad;
  });
  const primaryVideo = videos[0] ?? null;
  const highlightLink = rawLinks.find(
    (l) => l.kind?.toLowerCase() === "highlight" && !!l.url,
  );

  const freeVideo: FreeLayoutVideo | null = primaryVideo
    ? {
        url: primaryVideo.url,
        title: primaryVideo.title ?? null,
        provider: primaryVideo.provider ?? null,
      }
    : highlightLink
      ? {
          url: highlightLink.url,
          title: highlightLink.label ?? null,
          provider: null,
        }
      : null;

  const freePersonal: FreeLayoutPersonal = personalRow
    ? {
        languages: personalRow.languages ?? null,
        education: personalRow.education ?? null,
        residenceCity: personalRow.residenceCity ?? null,
        residenceCountry: personalRow.residenceCountry ?? null,
        residenceCountryCode: personalRow.residenceCountryCode ?? null,
        whatsapp: personalRow.whatsapp ?? null,
        showContactSection: personalRow.showContactSection ?? false,
      }
    : null;

  // Press notes layout preference is stored in profile_sections_visibility.settings
  // for the row with section='press'. Defaults to "newspaper" so existing Pro
  // players keep their current layout.
  const pressSection = sections.find((s) => s.section === "press");
  const pressSettings =
    pressSection?.settings && typeof pressSection.settings === "object"
      ? (pressSection.settings as Record<string, unknown>)
      : null;
  const pressLayout: "newspaper" | "cards" =
    pressSettings?.layout === "cards" ? "cards" : "newspaper";

  // Floating hero video for Pro layout (mobile-only island deployed from
  // header). Reuses the already-computed `primaryVideo` (sorted by isPrimary
  // → seasonYear → createdAt) so it matches what the user sees in the
  // tactics scroll-jacked section. Free layout already has its own video
  // block in the hero, so this stays null for Free.
  const heroFloatingVideo = !isFree && primaryVideo
    ? {
        url: primaryVideo.url,
        title: primaryVideo.title ?? null,
        provider: primaryVideo.provider ?? null,
      }
    : null;

  const publicData = {
    player,
    career: [],
    media,
    sections,
    articles,
    pressLayout,
    theme:
      theme || {
        layout: "futuristic",
        primaryColor: "#171717",
        accentColor: "#3B82F6",
        typography: "syncopate",
      },
    plan,
    heroFloatingVideo,
    // Owner-only upgrade nudge: when the player has a Pro subscription but
    // is currently rendering Free (because they chose theme.layout='free'),
    // we expose their userId to the client so the floating banner can
    // verify the viewer's session matches and only then show itself.
    // For Free-subscription players, this stays null and the nudge code
    // path is fully absent from the page.
    ownerProUpgradeNudgeUserId:
      isFree && subscriptionPlan === "pro" ? player.userId : null,
    freeData: isFree
      ? {
          personal: freePersonal,
          career: freeCareer,
          links: freeLinks,
          video: freeVideo,
          currentTeamCrestUrl: currentTeam?.crestUrl ?? null,
          currentTeamCountryCode: currentTeam?.countryCode ?? null,
          currentDivisionName: currentDivision?.name ?? null,
          currentDivisionCrestUrl: currentDivision?.crestUrl ?? null,
        }
      : null,
  };

  // Cross-ref al author hub si este jugador también escribe en el
  // blog (caso multi-rol). Consolida identidad Knowledge Graph via
  // sameAs[]. Lookup barato (1 query con UNIQUE index sobre user_id).
  const authorHubSlug = await getAuthorHubSlugForUser(player.userId);

  return (
    <>
      {/*
        JSON-LD Person/Athlete schema. Streamed in the initial HTML
        response so crawlers see the entity graph immediately. The
        component itself decides shape (lean Person vs full @graph
        with team + agency + breadcrumb) based on the player's plan.
      */}
      <PersonJsonLd
        plan={plan}
        player={{
          slug: player.slug,
          fullName: player.fullName,
          bio: player.bio ?? null,
          avatarUrl: player.avatarUrl ?? null,
          birthDate: player.birthDate ?? null,
          nationality: player.nationality ?? null,
          nationalityCodes: player.nationalityCodes ?? null,
          heightCm: player.heightCm ?? null,
          weightKg: player.weightKg ?? null,
          positions: player.positions ?? null,
          currentClub: player.currentClub ?? null,
          transfermarktUrl: player.transfermarktUrl ?? null,
          beSoccerUrl: player.beSoccerUrl ?? null,
          agency: player.agency
            ? { name: player.agency.name, slug: player.agency.slug }
            : null,
          authorHubSlug,
        }}
      />
      <LayoutResolver data={publicData} />
    </>
  );
}
