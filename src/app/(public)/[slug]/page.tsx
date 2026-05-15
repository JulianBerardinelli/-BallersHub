import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import {
  playerMedia,
  careerItems,
  statsSeasons,
  playerArticles,
  playerPersonalDetails,
  playerLinks,
  teams,
  divisions,
} from "@/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import LayoutResolver from "./components/LayoutResolver";
import type {
  FreeLayoutCareerRow,
  FreeLayoutLink,
  FreeLayoutPersonal,
  FreeLayoutVideo,
} from "./components/free/FreeLayout";

export const revalidate = 0; // DEVELOPMENT CACHE DISABLED
type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const player = await db.query.playerProfiles.findFirst({
    where: (p, { and, eq }) => and(eq(p.slug, slug), eq(p.visibility, "public"), eq(p.status, "approved")),
    columns: { fullName: true, bio: true, positions: true, avatarUrl: true, },
  });
  if (!player) return { title: "Jugador no encontrado" };

  const title = player.fullName;
  const description = player.bio?.slice(0, 160) ?? `Perfil de ${player.fullName}${player.positions?.length ? ` — ${player.positions.join(", ")}` : ""}`;
  return {
    title,
    description,
    openGraph: { title, description, url: `/${slug}`, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
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
  const sub = await db.query.subscriptions.findFirst({
    where: (s, { eq }) => eq(s.userId, player.userId),
    columns: { plan: true, limitsJson: true }
  });
  const limits = (sub?.limitsJson ?? {}) as Record<string, unknown>;
  const maxPhotos = Number(limits?.max_photos ?? 100);
  const maxVideos = Number(limits?.max_videos ?? 100);

  // DEV-ONLY override so we can preview the Free layout on any /[slug]
  // without flipping subscriptions in the DB. Trips on `?force_free=1`
  // and only when NODE_ENV !== 'production'. Strips itself in prod.
  const devForceFree =
    process.env.NODE_ENV !== "production" && sp.force_free === "1";

  const plan = devForceFree
    ? ("free" as const)
    : ((sub?.plan ?? "free") as "free" | "pro" | "pro_plus");
  const isFree = plan === "free";

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

  // Resolve teams + divisions for career rows (and the player's current
  // club) in one shot so the Free layout can show real crests/flags.
  const teamIdSet = new Set<string>();
  for (const c of careerRows) if (c.teamId) teamIdSet.add(c.teamId);
  if (player.currentTeamId) teamIdSet.add(player.currentTeamId);

  const teamRows = teamIdSet.size
    ? await db.select().from(teams).where(inArray(teams.id, Array.from(teamIdSet)))
    : [];
  const teamById = new Map(teamRows.map((t) => [t.id, t]));

  const divisionIdSet = new Set<string>();
  for (const c of careerRows) if (c.divisionId) divisionIdSet.add(c.divisionId);
  for (const t of teamRows) if (t.divisionId) divisionIdSet.add(t.divisionId);

  const divisionRows = divisionIdSet.size
    ? await db
        .select()
        .from(divisions)
        .where(inArray(divisions.id, Array.from(divisionIdSet)))
    : [];
  const divisionById = new Map(divisionRows.map((d) => [d.id, d]));

  const media = [
    ...rawMedia.filter((m) => m.type === "photo").slice(0, maxPhotos),
    ...rawMedia.filter((m) => m.type === "video").slice(0, maxVideos),
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
    const divisionId = c.divisionId ?? team?.divisionId ?? null;
    const division = divisionId ? divisionById.get(divisionId) : null;
    return {
      id: c.id,
      club: team?.name ?? c.club,
      countryCode: team?.countryCode ?? null,
      divisionName: division?.name ?? c.division ?? null,
      divisionCrestUrl: division?.crestUrl ?? null,
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

  // Free plan = 1 video. Prefer the approved isPrimary video, fall back to
  // the most recently uploaded approved video. If the player has no video
  // in player_media, fall back to a `kind=highlight` URL from player_links.
  const videos = rawMedia.filter((m) => m.type === "video" && m.isApproved);
  videos.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
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

  const publicData = {
    player,
    career: [],
    media,
    sections,
    articles,
    theme:
      theme || {
        layout: "futuristic",
        primaryColor: "#171717",
        accentColor: "#3B82F6",
        typography: "syncopate",
      },
    plan,
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

  return <LayoutResolver data={publicData} />;
}
