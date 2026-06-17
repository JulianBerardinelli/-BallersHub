import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  coachProfiles,
  coachCareerItems,
  coachStatsSeasons,
  coachMedia,
  coachHonours,
  coachLicenses,
  coachLinks,
  agencyProfiles,
} from "@/db/schema";
import {
  getAvailableCoachLocales,
  getCoachTranslation,
  mergeCoachContent,
  getCoachHonourTranslations,
  type ContentLocale,
} from "@/lib/i18n/profile-content";
import { resolveProUserIds, FREE_BIO_INDEX_MIN_CHARS } from "@/lib/seo/indexable-profiles";
import { conditionalAlternates } from "@/lib/seo/hreflang";
import { toCanonicalUrl } from "@/lib/seo/baseUrl";
import { OG_LOCALE } from "@/i18n/config";
import { routing, type Locale } from "@/i18n/routing";
import { CoachJsonLd, type CoachJsonLdData } from "@/lib/seo/coachJsonLd";
import CoachPortfolio, {
  computeCoachRecord,
  type CoachPortfolioData,
  type CoachCareerRow,
  type CoachStatRow,
  type CoachMediaRow,
  type CoachHonourRow,
  type CoachLicenseRow,
} from "./components/CoachPortfolio";
import PortfolioLocaleSwitcher from "@/components/i18n/PortfolioLocaleSwitcher";
import SmoothScrollProvider from "./components/pro/SmoothScrollProvider";
import ProCoachLayout, { type CoachProData } from "./components/pro/ProCoachLayout";
import PortfolioFooter from "@/components/layout/footer/PortfolioFooter";

export const revalidate = 3600;

type RouteParams = { locale: string; slug: string };

const yearOf = (d: string | null) => (d ? Number(String(d).slice(0, 4)) || null : null);

function roleLabel(roleTitle: string | null): string {
  return roleTitle?.trim() || "Director Técnico";
}

function buildDescription(opts: {
  bio: string | null;
  fullName: string;
  roleTitle: string | null;
  currentClub: string | null;
  nationality: string[] | null;
}): string {
  if (opts.bio && opts.bio.trim().length > 0) {
    const clean = opts.bio.replace(/\s+/g, " ").trim();
    if (clean.length <= 158) return clean;
    const cut = clean.slice(0, 158);
    const lastSpace = cut.lastIndexOf(" ");
    return `${cut.slice(0, lastSpace > 80 ? lastSpace : 158)}…`;
  }
  const bits = [
    `${roleLabel(opts.roleTitle)}: ${opts.fullName}`,
    opts.currentClub,
    (opts.nationality ?? []).join(", ") || null,
  ].filter(Boolean);
  return `${bits.join(" — ")}. Trayectoria, licencias y palmarés verificados en 'BallersHub.`;
}

// --------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = (routing.locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : routing.defaultLocale;

  const [coach] = await db
    .select({
      id: coachProfiles.id,
      userId: coachProfiles.userId,
      fullName: coachProfiles.fullName,
      roleTitle: coachProfiles.roleTitle,
      currentClub: coachProfiles.currentClub,
      bio: coachProfiles.bio,
      avatarUrl: coachProfiles.avatarUrl,
      nationality: coachProfiles.nationality,
    })
    .from(coachProfiles)
    .where(
      and(
        eq(coachProfiles.slug, slug),
        eq(coachProfiles.visibility, "public"),
        eq(coachProfiles.status, "approved"),
      ),
    )
    .limit(1);

  if (!coach) {
    return { title: "Entrenador no encontrado · 'BallersHub", robots: { index: false, follow: false } };
  }

  const available = await getAvailableCoachLocales(coach.id);
  const thisLocaleExists = available.includes(locale as ContentLocale);
  const translation = await getCoachTranslation(coach.id, locale);
  const localizedBio = translation?.bio ?? coach.bio;

  // Soft-noindex for thin Free profiles (parity with players).
  let softNoindex = false;
  if ((localizedBio?.trim().length ?? 0) < FREE_BIO_INDEX_MIN_CHARS) {
    const proIds = await resolveProUserIds([coach.userId]);
    softNoindex = !proIds.has(coach.userId);
  }

  const { canonical, languages } = conditionalAlternates(locale, `/coach/${slug}`, available);
  const noindex = !thisLocaleExists || softNoindex;

  const title = [
    coach.fullName,
    roleLabel(coach.roleTitle),
    coach.currentClub,
  ]
    .filter(Boolean)
    .join(" — ");
  const description = buildDescription({
    bio: localizedBio,
    fullName: coach.fullName,
    roleTitle: coach.roleTitle,
    currentClub: coach.currentClub,
    nationality: coach.nationality,
  });
  const ogImage = coach.avatarUrl ? toCanonicalUrl(coach.avatarUrl) : undefined;

  return {
    title,
    description,
    alternates: { canonical, languages },
    ...(noindex && { robots: { index: false, follow: true } }),
    openGraph: {
      title,
      description,
      url: canonical,
      type: "profile",
      siteName: "'BallersHub",
      locale: OG_LOCALE[locale],
      ...(ogImage && { images: [{ url: ogImage, alt: coach.fullName }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

// --------------------------------------------------------------------------
export default async function CoachPublicPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = (routing.locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : routing.defaultLocale;

  const [coach] = await db
    .select()
    .from(coachProfiles)
    .where(
      and(
        eq(coachProfiles.slug, slug),
        eq(coachProfiles.visibility, "public"),
        eq(coachProfiles.status, "approved"),
      ),
    )
    .limit(1);

  if (!coach) notFound();

  // Locale that has no real translation → redirect to the prefix-less ES URL
  // (never serve fallback-ES under a foreign prefix). ES always exists.
  const available = await getAvailableCoachLocales(coach.id);
  if (locale !== "es" && !available.includes(locale as ContentLocale)) {
    redirect(`/coach/${slug}`);
  }

  const translation = await getCoachTranslation(coach.id, locale);
  const content = mergeCoachContent(
    {
      bio: coach.bio,
      careerObjectives: coach.careerObjectives,
      playingStyle: coach.playingStyle,
      methodologyAnalysis: coach.methodologyAnalysis,
      analysisAuthor: coach.analysisAuthor,
    },
    translation,
  );

  const [careerRows, statRows, mediaRows, honourRows, licenseRows, linkRows, proIds, agency] =
    await Promise.all([
      db
        .select()
        .from(coachCareerItems)
        .where(eq(coachCareerItems.coachId, coach.id))
        .orderBy(desc(coachCareerItems.startDate)),
      db
        .select()
        .from(coachStatsSeasons)
        .where(eq(coachStatsSeasons.coachId, coach.id))
        .orderBy(desc(coachStatsSeasons.season)),
      db
        .select()
        .from(coachMedia)
        .where(and(eq(coachMedia.coachId, coach.id), eq(coachMedia.status, "approved")))
        .orderBy(desc(coachMedia.createdAt)),
      db
        .select()
        .from(coachHonours)
        .where(eq(coachHonours.coachId, coach.id))
        .orderBy(desc(coachHonours.awardedOn)),
      db
        .select()
        .from(coachLicenses)
        .where(and(eq(coachLicenses.coachId, coach.id), eq(coachLicenses.status, "approved")))
        .orderBy(coachLicenses.position),
      db.select().from(coachLinks).where(eq(coachLinks.coachId, coach.id)),
      resolveProUserIds([coach.userId]),
      coach.agencyId
        ? db
            .select({ name: agencyProfiles.name, slug: agencyProfiles.slug })
            .from(agencyProfiles)
            .where(eq(agencyProfiles.id, coach.agencyId))
            .limit(1)
        : Promise.resolve([] as { name: string; slug: string }[]),
    ]);

  const isPro = proIds.has(coach.userId);

  // Localized honours (es fallback).
  const honourTr = await getCoachHonourTranslations(
    honourRows.map((h) => h.id),
    locale,
  );

  const career: CoachCareerRow[] = careerRows.map((c) => ({
    id: c.id,
    club: c.club,
    roleTitle: c.roleTitle,
    division: c.division,
    startYear: yearOf(c.startDate),
    endYear: yearOf(c.endDate),
  }));

  const stats: CoachStatRow[] = statRows.map((s) => ({
    id: s.id,
    season: s.season,
    team: s.team,
    competition: s.competition,
    matches: s.matches,
    wins: s.wins,
    draws: s.draws,
    losses: s.losses,
    goalsFor: s.goalsFor,
    goalsAgainst: s.goalsAgainst,
  }));
  const record = computeCoachRecord(stats);

  const media: CoachMediaRow[] = mediaRows
    .filter((m) => m.type === "photo" || m.type === "video")
    .map((m) => ({
      id: m.id,
      type: m.type as "photo" | "video",
      url: m.url,
      title: m.title,
    }));

  const honours: CoachHonourRow[] = honourRows.map((h) => {
    const tr = honourTr.get(h.id);
    return {
      id: h.id,
      title: (tr?.title ?? h.title) || h.title,
      competition: tr?.competition ?? h.competition,
      season: h.season,
    };
  });

  const licenses: CoachLicenseRow[] = licenseRows.map((l) => ({
    id: l.id,
    title: l.title,
    issuer: l.issuer,
    year: l.awardedYear,
  }));

  const links = linkRows.map((l) => ({ label: l.label, url: l.url, kind: l.kind }));

  const data: CoachPortfolioData = {
    fullName: coach.fullName,
    roleTitle: coach.roleTitle,
    avatarUrl: coach.avatarUrl,
    nationality: coach.nationality,
    birthDate: coach.birthDate,
    currentClub: coach.currentClub,
    coachingSince: coach.coachingSince,
    bio: content.bio,
    playingStyle: content.playingStyle,
    methodologyAnalysis: content.methodologyAnalysis,
    preferredFormations: coach.preferredFormations,
    career,
    stats,
    record,
    honours,
    licenses,
    media,
    links,
    isPro,
  };

  const plan = isPro ? "pro" : "free";
  const agencyRef = agency[0] ?? null;

  const jsonLd: CoachJsonLdData = {
    slug: coach.slug,
    fullName: coach.fullName,
    bio: content.bio,
    avatarUrl: coach.avatarUrl,
    birthDate: coach.birthDate,
    nationality: coach.nationality,
    nationalityCodes: coach.nationalityCodes,
    roleTitle: coach.roleTitle,
    currentClub: coach.currentClub,
    coachingSince: coach.coachingSince,
    preferredFormations: coach.preferredFormations,
    transfermarktUrl: coach.transfermarktUrl,
    socials: linkRows
      .map((l) => l.url)
      .filter((u): u is string => typeof u === "string" && u.length > 0),
    agency: agencyRef ? { name: agencyRef.name, slug: agencyRef.slug } : null,
    licenses: licenses.map((l) => ({ title: l.title, issuer: l.issuer, year: l.year })),
    honours: honours.map((h) => h.title),
    record: record ? { matches: record.matches, winPct: record.winPct } : null,
  };

  // Pro coaches get the premium scrolljacking layout (a copy of the player Pro
  // portfolio, adapted). Free coaches keep the sober editorial dossier.
  if (isPro) {
    const proData: CoachProData = {
      fullName: coach.fullName,
      roleTitle: coach.roleTitle,
      avatarUrl: coach.avatarUrl,
      heroUrl: coach.heroUrl,
      nationality: coach.nationality,
      nationalityCodes: coach.nationalityCodes,
      currentClub: coach.currentClub,
      coachingSince: coach.coachingSince,
      bio: content.bio,
      playingStyle: content.playingStyle,
      methodologyAnalysis: content.methodologyAnalysis,
      preferredFormations: coach.preferredFormations,
      career,
      stats,
      record,
      honours,
      licenses,
      media,
      links,
      localeSwitch:
        available.length > 1
          ? { available, current: locale, basePath: `/coach/${slug}` }
          : undefined,
    };
    return (
      <>
        <CoachJsonLd coach={jsonLd} plan={plan} locale={locale} />
        <SmoothScrollProvider>
          <div
            className="relative min-h-screen w-full overflow-x-clip font-body"
            style={{ backgroundColor: "#050505", color: "#fff" }}
          >
            <ProCoachLayout data={proData} />
          </div>
          <PortfolioFooter
            ownerName={coach.fullName}
            ownerSlug={coach.slug}
            backgroundColor="#050505"
            primaryColor="#ccff00"
            secondaryColor="#050505"
            accentColor="#ccff00"
          />
        </SmoothScrollProvider>
      </>
    );
  }

  return (
    <>
      <CoachJsonLd coach={jsonLd} plan={plan} locale={locale} />
      {available.length > 1 && (
        <PortfolioLocaleSwitcher basePath={`/coach/${slug}`} available={available} current={locale} />
      )}
      <CoachPortfolio data={data} />
    </>
  );
}
