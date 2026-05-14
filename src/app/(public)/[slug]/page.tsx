import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import {
  playerMedia,
  careerItems,
  statsSeasons,
  playerArticles,
  playerPersonalDetails,
} from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import LayoutResolver from "./components/LayoutResolver";
import type {
  FreeLayoutCareerRow,
  FreeLayoutPersonal,
} from "./components/free/FreeLayout";
import { PersonJsonLd } from "@/lib/seo/personJsonLd";
import { formatPlayerPositions } from "@/lib/format";

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
  return `${segments.join(" — ")}. Trayectoria, estadísticas, galería y contacto en BallersHub.`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const player = await db.query.playerProfiles.findFirst({
    where: (p, { and, eq }) =>
      and(eq(p.slug, slug), eq(p.visibility, "public"), eq(p.status, "approved")),
    columns: {
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

  const title = buildSeoTitle(player);
  const description = buildSeoDescription(player);
  const canonical = `/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "profile",
      siteName: "BallersHub",
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
  const [rawMedia, theme, sections, articles, personalRow, careerRows, statsRows] =
    await Promise.all([
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
      // Free layout needs personal + career + stats. Cheaper to fetch them
      // unconditionally than to gate behind `isFree` and refetch later if
      // the plan check resolves differently.
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
    ]);

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
    return {
      id: c.id,
      club: c.club,
      countryCode: null, // we don't yet store club country; the row
                         // gracefully renders without a flag.
      divisionName: c.division ?? null,
      startYear,
      endYear,
      isCurrent: !c.endDate,
      stats: statsByCareerId.get(c.id) ?? null,
    };
  });

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
      ? { personal: freePersonal, career: freeCareer }
      : null,
  };

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
        }}
      />
      <LayoutResolver data={publicData} />
    </>
  );
}
