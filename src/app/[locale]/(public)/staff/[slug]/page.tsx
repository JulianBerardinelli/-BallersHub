import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { and, eq, asc, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  coachProfiles,
  coachCareerItems,
  coachStatsSeasons,
  coachMedia,
  coachArticles,
  coachHonours,
  coachLicenses,
  coachLinks,
  coachPersonalDetails,
  coachMethodologyRubros,
  coachGameIdeas,
  agencyProfiles,
  teams,
} from "@/db/schema";
import { docMimeFromUrl } from "@/lib/coach/methodology-data";
import {
  getAvailableCoachLocales,
  getCoachTranslation,
  mergeCoachContent,
  getCoachHonourTranslations,
  getCoachMethodologyRubroTranslations,
  type ContentLocale,
} from "@/lib/i18n/profile-content";
import { resolveProUserIds, FREE_BIO_INDEX_MIN_CHARS } from "@/lib/seo/indexable-profiles";
import { conditionalAlternates } from "@/lib/seo/hreflang";
import { OG_LOCALE } from "@/i18n/config";
import { routing, type Locale } from "@/i18n/routing";
import { CoachJsonLd, type CoachJsonLdData } from "@/lib/seo/coachJsonLd";
import {
  isHeadCoachLayout,
  isStaffRole,
  staffRoleLabel,
  staffRolesSummary,
  normalizeExperienceKind,
  staffExperienceKindLabel,
  type StaffRoleType,
} from "@/lib/staff/roles";
import { getTranslations } from "next-intl/server";
import {
  computeCoachRecord,
  type CoachPortfolioData,
  type CoachCareerRow,
  type CoachStatRow,
  type CoachMediaRow,
  type CoachHonourRow,
  type CoachLicenseRow,
  type CoachArticleRow,
  type CoachPersonalDetailsData,
  type CoachMethodologyRubroRow,
  type CoachMethodologyDocRow,
  type CoachGameIdeaRow,
} from "./components/CoachPortfolio";
import { parsePitchBoard } from "@/lib/coach/game-ideas";
import CoachFreeLayout from "./components/free/CoachFreeLayout";
import PortfolioLocaleSwitcher from "@/components/i18n/PortfolioLocaleSwitcher";
import SmoothScrollProvider from "./components/pro/SmoothScrollProvider";
import ProCoachLayout, { type CoachProData } from "./components/pro/ProCoachLayout";
import PortfolioFooter from "@/components/layout/footer/PortfolioFooter";

export const revalidate = 3600;

type RouteParams = { locale: string; slug: string };

const yearOf = (d: string | null) => (d ? Number(String(d).slice(0, 4)) || null : null);

function roleLabel(roleTitle: string | null): string {
  return roleTitle?.trim() || "Cuerpo Técnico";
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
      primaryRole: coachProfiles.primaryRole,
      secondaryRoles: coachProfiles.secondaryRoles,
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

  const { canonical, languages } = conditionalAlternates(locale, `/staff/${slug}`, available);
  const noindex = !thisLocaleExists || softNoindex;

  const tStaffMeta = await getTranslations({ locale, namespace: "staff" });
  const roleForTitle =
    staffRolesSummary(
      coach.primaryRole,
      coach.secondaryRoles,
      tStaffMeta as unknown as (key: string) => string,
    ) || roleLabel(coach.roleTitle);
  const title = [
    coach.fullName,
    roleForTitle,
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
      // og:image comes from `opengraph-image.tsx` (branded card). Don't set
      // `images` here — it would override the file convention with the avatar.
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
    redirect(`/staff/${slug}`);
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

  const [
    careerRows,
    statRows,
    mediaRows,
    articleRows,
    honourRows,
    licenseRows,
    linkRows,
    personalRow,
    proIds,
    agency,
    rubroRows,
    gameIdeaRows,
  ] = await Promise.all([
      // leftJoin con teams para traer el escudo + el Transfermarkt del club
      // por etapa (P1.3). `teamId` es la FK opcional; cuando es null (club como
      // texto libre legacy) crestUrl/teamTransfermarktUrl quedan null y el
      // render cae al placeholder con la inicial.
      db
        .select({
          id: coachCareerItems.id,
          club: coachCareerItems.club,
          experienceKind: coachCareerItems.experienceKind,
          roleTitle: coachCareerItems.roleTitle,
          roles: coachCareerItems.roles,
          division: coachCareerItems.division,
          startDate: coachCareerItems.startDate,
          endDate: coachCareerItems.endDate,
          teamId: coachCareerItems.teamId,
          crestUrl: teams.crestUrl,
          teamTransfermarktUrl: teams.transfermarktUrl,
        })
        .from(coachCareerItems)
        .leftJoin(teams, eq(coachCareerItems.teamId, teams.id))
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
      // Press notes (coach_articles). Owner's manual order first (position asc),
      // most-recent publishedAt as the tiebreaker for legacy rows at position 0.
      db
        .select()
        .from(coachArticles)
        .where(eq(coachArticles.coachId, coach.id))
        .orderBy(asc(coachArticles.position), desc(coachArticles.publishedAt)),
      db
        .select()
        .from(coachHonours)
        .where(and(eq(coachHonours.coachId, coach.id), eq(coachHonours.status, "approved")))
        .orderBy(asc(coachHonours.position), desc(coachHonours.awardedOn)),
      db
        .select()
        .from(coachLicenses)
        .where(and(eq(coachLicenses.coachId, coach.id), eq(coachLicenses.status, "approved")))
        .orderBy(coachLicenses.position),
      db.select().from(coachLinks).where(eq(coachLinks.coachId, coach.id)),
      db
        .select()
        .from(coachPersonalDetails)
        .where(eq(coachPersonalDetails.coachId, coach.id))
        .limit(1),
      resolveProUserIds([coach.userId]),
      coach.agencyId
        ? db
            .select({ name: agencyProfiles.name, slug: agencyProfiles.slug })
            .from(agencyProfiles)
            .where(eq(agencyProfiles.id, coach.agencyId))
            .limit(1)
        : Promise.resolve([] as { name: string; slug: string }[]),
      db
        .select({
          id: coachMethodologyRubros.id,
          title: coachMethodologyRubros.title,
          icon: coachMethodologyRubros.icon,
          body: coachMethodologyRubros.body,
        })
        .from(coachMethodologyRubros)
        .where(
          and(
            eq(coachMethodologyRubros.coachId, coach.id),
            eq(coachMethodologyRubros.status, "approved"),
          ),
        )
        .orderBy(asc(coachMethodologyRubros.position)),
      // Ideas de Juego approved (Pro + DT). Sólo se montan en el Pro path DT.
      db
        .select({
          id: coachGameIdeas.id,
          title: coachGameIdeas.title,
          formation: coachGameIdeas.formation,
          blurb: coachGameIdeas.blurb,
          link: coachGameIdeas.link,
          pitchBoard: coachGameIdeas.pitchBoard,
        })
        .from(coachGameIdeas)
        .where(
          and(eq(coachGameIdeas.coachId, coach.id), eq(coachGameIdeas.status, "approved")),
        )
        .orderBy(asc(coachGameIdeas.position)),
    ]);

  const isPro = proIds.has(coach.userId);

  // Localized honours (es fallback).
  const honourTr = await getCoachHonourTranslations(
    honourRows.map((h) => h.id),
    locale,
  );

  // Translator de roles (namespace `staff`) para localizar los chips de
  // `roles[]` por etapa. Mismo namespace que el roleDisplay del perfil.
  const tStaffRolesForCareer = await getTranslations({ locale, namespace: "staff" });
  const localizeRoles = (raw: unknown): { roles: StaffRoleType[]; roleLabels: string[] } => {
    const roles = (Array.isArray(raw) ? raw : []).filter(isStaffRole);
    return {
      roles,
      roleLabels: roles.map((r) =>
        staffRoleLabel(r, tStaffRolesForCareer as unknown as (key: string) => string),
      ),
    };
  };

  const career: CoachCareerRow[] = careerRows.map((c) => {
    const { roles, roleLabels } = localizeRoles((c as { roles?: unknown }).roles);
    // El crest sólo se muestra si es una URL http(s) real (escudo subido). El
    // default local `/images/team-default.svg` cae al placeholder con la
    // inicial del club, más informativo que un genérico.
    const crestUrl =
      typeof c.crestUrl === "string" && /^https?:\/\//i.test(c.crestUrl) ? c.crestUrl : null;
    const teamTransfermarktUrl =
      typeof c.teamTransfermarktUrl === "string" && /^https?:\/\//i.test(c.teamTransfermarktUrl)
        ? c.teamTransfermarktUrl
        : null;
    // Tipo de experiencia: `club` no muestra badge; job/project sí (label localizado).
    const experienceKind = normalizeExperienceKind(c.experienceKind);
    const experienceKindLabel =
      experienceKind === "club"
        ? null
        : staffExperienceKindLabel(
            experienceKind,
            tStaffRolesForCareer as unknown as (key: string) => string,
          );
    return {
      id: c.id,
      club: c.club,
      experienceKind,
      experienceKindLabel,
      roleTitle: c.roleTitle,
      roles,
      roleLabels,
      division: c.division,
      startYear: yearOf(c.startDate),
      endYear: yearOf(c.endDate),
      crestUrl,
      teamTransfermarktUrl,
    };
  });

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

  // Map etapa → club para resolver el `careerLabel` de cada logro vinculado.
  const careerClubById = new Map(career.map((c) => [c.id, c.club]));
  const honours: CoachHonourRow[] = honourRows.map((h) => {
    const tr = honourTr.get(h.id);
    const careerItemId = (h as { careerItemId: string | null }).careerItemId ?? null;
    return {
      id: h.id,
      title: (tr?.title ?? h.title) || h.title,
      competition: tr?.competition ?? h.competition,
      season: h.season,
      description: (tr?.description ?? h.description) || null,
      careerItemId,
      careerLabel: careerItemId ? (careerClubById.get(careerItemId) ?? null) : null,
      videoUrl: (h as { videoUrl: string | null }).videoUrl ?? null,
    };
  });

  const licenses: CoachLicenseRow[] = licenseRows.map((l) => ({
    id: l.id,
    title: l.title,
    issuer: l.issuer,
    year: l.awardedYear,
    docUrl: l.docUrl,
  }));

  const links = linkRows.map((l) => ({ label: l.label, url: l.url, kind: l.kind }));

  // Press notes for the Pro layout (rendered only when there are articles).
  const articles: CoachArticleRow[] = articleRows.map((a) => ({
    id: a.id,
    title: a.title,
    url: a.url,
    imageUrl: a.imageUrl,
    publisher: a.publisher,
    publishedAt: a.publishedAt,
    position: a.position,
  }));

  // Personal details (drives the Pro contact module's WhatsApp + show toggle).
  const personalDetails: CoachPersonalDetailsData | null = personalRow[0]
    ? {
        whatsapp: personalRow[0].whatsapp,
        showContactSection: personalRow[0].showContactSection,
        languages: personalRow[0].languages,
        education: personalRow[0].education,
        residenceCity: personalRow[0].residenceCity,
        residenceCountry: personalRow[0].residenceCountry,
        residenceCountryCode: personalRow[0].residenceCountryCode,
      }
    : null;

  // Roles estructurados (staff) + fork de layout. primary_role null →
  // showTactical=true (no rompe coaches sin rol todavía); oculta las secciones
  // DT (ideas de juego / formaciones) sólo en oficios NO-DT conocidos.
  const showTactical = coach.primaryRole == null || isHeadCoachLayout(coach.primaryRole);
  const tStaffRoles = await getTranslations({ locale, namespace: "staff" });
  const roleDisplay =
    staffRolesSummary(
      coach.primaryRole,
      coach.secondaryRoles,
      tStaffRoles as unknown as (key: string) => string,
    ) ||
    coach.roleTitle?.trim() ||
    null;

  // Metodología (universal). Docs salen de mediaRows (approved, type='doc' + rubro_id).
  const methodologyDocsByRubro = new Map<string, CoachMethodologyDocRow[]>();
  for (const m of mediaRows) {
    if (m.type === "doc" && m.rubroId) {
      const list = methodologyDocsByRubro.get(m.rubroId) ?? [];
      list.push({ id: m.id, url: m.url, title: m.title, mime: docMimeFromUrl(m.url) });
      methodologyDocsByRubro.set(m.rubroId, list);
    }
  }
  // Traducciones por-perfil de los rubros (es fallback). Mismo modelo que honours.
  const rubroTr = await getCoachMethodologyRubroTranslations(
    rubroRows.map((r) => r.id),
    locale,
  );
  const methodologyAll: CoachMethodologyRubroRow[] = rubroRows.map((r) => {
    const tr = rubroTr.get(r.id);
    return {
      id: r.id,
      title: tr?.title?.trim() ? tr.title : r.title,
      icon: r.icon,
      body: tr?.body?.trim() ? tr.body : r.body,
      docs: methodologyDocsByRubro.get(r.id) ?? [],
    };
  });
  // D7: Free hasta 2 rubros, sin archivos. Pro: todo.
  const methodologyFree: CoachMethodologyRubroRow[] = methodologyAll
    .slice(0, 2)
    .map((r) => ({ ...r, docs: [] }));

  // Ideas de Juego approved (pizarra). pitch_board jsonb → PitchBoard validado.
  const gameIdeas: CoachGameIdeaRow[] = gameIdeaRows.map((g) => ({
    id: g.id,
    title: g.title,
    formation: g.formation,
    blurb: g.blurb,
    link: g.link,
    board: parsePitchBoard(g.pitchBoard),
  }));

  // Datos personales públicos (residencia/educación/idiomas) para el Free
  // BioFicha §01. El Pro layout ya los consume vía `personalDetails` directo
  // (incluye también whatsapp + show_contact_section privados). Acá filtramos
  // a los campos seguros para mostrar también a Free, sin tocar el contrato
  // de personalDetails completo.
  const publicPersonalDetails = personalRow[0]
    ? {
        residence:
          [personalRow[0].residenceCity, personalRow[0].residenceCountry]
            .map((v) => (v ?? "").trim())
            .filter((v) => v.length > 0)
            .join(", ") || null,
        education: personalRow[0].education?.trim() || null,
        languages: personalRow[0].languages?.length ? personalRow[0].languages : null,
      }
    : null;

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
    primaryRole: coach.primaryRole,
    secondaryRoles: coach.secondaryRoles,
    roleDisplay,
    showTactical,
    methodology: methodologyFree,
    publicPersonalDetails,
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
    primaryRoleLabel: coach.primaryRole
      ? staffRoleLabel(coach.primaryRole, tStaffRoles as unknown as (key: string) => string)
      : null,
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
    // Resolve the coach owner's auth email (same mechanism as the player
    // ContactPortfolioModule). The Drizzle connection uses the direct Postgres
    // URL, which has access to the auth schema. Only queried on the Pro path.
    let ownerEmail: string | null = null;
    try {
      const rows = await db.execute<{ email: string | null }>(
        sql`select email from auth.users where id = ${coach.userId} limit 1`,
      );
      ownerEmail = rows.rows[0]?.email ?? null;
    } catch {
      ownerEmail = null;
    }

    const proData: CoachProData = {
      fullName: coach.fullName,
      roleTitle: coach.roleTitle,
      primaryRole: coach.primaryRole,
      secondaryRoles: coach.secondaryRoles,
      roleDisplay,
      showTactical,
      methodology: methodologyAll,
      gameIdeas,
      avatarUrl: coach.avatarUrl,
      heroUrl: coach.heroUrl,
      // Render usa modelUrl1 con fallback a modelUrl2 (compat futura — sólo
      // modelUrl1 es editable hoy).
      modelUrl1: coach.modelUrl1 ?? coach.modelUrl2,
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
      articles,
      personalDetails,
      ownerEmail,
      slug: coach.slug,
      themePrimaryColor: coach.themePrimaryColor,
      themeAccentColor: coach.themeAccentColor,
      themeBackgroundColor: coach.themeBackgroundColor,
      localeSwitch:
        available.length > 1
          ? { available, current: locale, basePath: `/staff/${slug}` }
          : undefined,
    };
    const themeBg = coach.themeBackgroundColor || "#050505";
    const themeAccent = coach.themeAccentColor || "#ccff00";
    return (
      <>
        <CoachJsonLd coach={jsonLd} plan={plan} locale={locale} />
        <SmoothScrollProvider>
          <div
            className="relative min-h-screen w-full overflow-x-clip font-body"
            style={{ backgroundColor: themeBg, color: "#fff" }}
          >
            <ProCoachLayout data={proData} />
          </div>
          <PortfolioFooter
            ownerKind="coach"
            ownerName={coach.fullName}
            ownerSlug={coach.slug}
            backgroundColor={themeBg}
            primaryColor={coach.themePrimaryColor || themeAccent}
            secondaryColor={themeBg}
            accentColor={themeAccent}
          />
        </SmoothScrollProvider>
      </>
    );
  }

  return (
    <>
      <CoachJsonLd coach={jsonLd} plan={plan} locale={locale} />
      {available.length > 1 && (
        <PortfolioLocaleSwitcher basePath={`/staff/${slug}`} available={available} current={locale} />
      )}
      <CoachFreeLayout data={data} ownerUserId={coach.userId} />
    </>
  );
}
