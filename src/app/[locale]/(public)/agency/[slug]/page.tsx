import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import {
  agencyProfiles,
  agencyThemeSettings,
  agencySectionsVisibility,
  agencyCountryProfiles,
  agencyTeamRelations,
  playerProfiles,
  userProfiles,
  managerProfiles,
  teams,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import AgencyLayoutResolver, { type AgencyPublicData } from "./components/AgencyLayoutResolver";
import { AgencyJsonLd } from "@/lib/seo/agencyJsonLd";
import PortfolioLocaleSwitcher from "@/components/i18n/PortfolioLocaleSwitcher";
import { conditionalAlternates } from "@/lib/seo/hreflang";
import {
  getAvailableAgencyLocales,
  getAgencyTranslation,
  mergeAgencyContent,
  mergeAgencyServices,
  getAgencyCountryProfileTranslations,
  mergeAgencyCountryProfileContent,
} from "@/lib/i18n/profile-content";
import { OG_LOCALE } from "@/i18n/config";
import type { Locale } from "@/i18n/routing";

// Public agency portfolios cache for an hour. See the matching note in
// `[slug]/page.tsx` — the previous `revalidate = 0` was a dev hack.
export const revalidate = 3600;

type Params = Promise<{ locale: string; slug: string }>;

function buildAgencyDescription(agency: {
  name: string;
  description: string | null;
}): string {
  if (agency.description && agency.description.trim().length > 0) {
    const clean = agency.description.replace(/\s+/g, " ").trim();
    if (clean.length <= 158) return clean;
    const cut = clean.slice(0, 158);
    const lastSpace = cut.lastIndexOf(" ");
    return `${cut.slice(0, lastSpace > 0 ? lastSpace : 158)}…`;
  }
  return `Perfil oficial de ${agency.name} en 'BallersHub — cartera de jugadores representados, staff, países operativos y contacto verificado.`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!slug) {
    return {
      title: "Agencia no encontrada",
      robots: { index: false, follow: false },
    };
  }

  const agency = await db.query.agencyProfiles.findFirst({
    where: eq(agencyProfiles.slug, slug),
    columns: { id: true, name: true, description: true, logoUrl: true },
  });

  if (!agency) {
    return {
      title: "Agencia no encontrada",
      robots: { index: false, follow: false },
    };
  }

  // F5: conditional hreflang (only real translations) + localized description.
  const available = await getAvailableAgencyLocales(agency.id);
  const thisLocaleExists = available.includes(locale as Locale);
  const translation = await getAgencyTranslation(agency.id, locale);
  const localizedDescription =
    translation?.description && translation.description.trim() !== ""
      ? translation.description
      : agency.description;

  const title = `${agency.name} — Agencia de representación`;
  const description = buildAgencyDescription({
    name: agency.name,
    description: localizedDescription,
  });
  const { canonical, languages } = conditionalAlternates(
    locale as Locale,
    `/agency/${slug}`,
    available,
  );

  return {
    title,
    description,
    alternates: { canonical, languages },
    ...(!thisLocaleExists && { robots: { index: false, follow: true } }),
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: "'BallersHub",
      locale: OG_LOCALE[locale as Locale],
      images: agency.logoUrl
        ? [{ url: agency.logoUrl, alt: agency.name }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: agency.logoUrl ? [agency.logoUrl] : undefined,
    },
  };
}

export default async function AgencyPublicPage({ params }: { params: Params }) {
  const { locale, slug } = await params;

  if (!slug) return notFound();

  const rawAgency = await db.query.agencyProfiles.findFirst({
    where: eq(agencyProfiles.slug, slug),
  });

  if (!rawAgency) return notFound();

  // A localized URL only exists if the agency is really translated into that
  // locale; otherwise redirect to the canonical es URL instead of rendering a
  // fallback-es page under a foreign prefix.
  const availableLocales = await getAvailableAgencyLocales(rawAgency.id);
  if (locale !== "es" && !availableLocales.includes(locale as Locale)) {
    redirect(`/agency/${slug}`);
  }

  // F5: override description + tagline with this locale's translation
  // (fallback ES). Downstream modules read the already-localized `agency`.
  const agencyTranslation = await getAgencyTranslation(rawAgency.id, locale);
  const agency = { ...rawAgency, ...mergeAgencyContent(rawAgency, agencyTranslation) };

  // Localized services array (positional JSONB merge: see mergeAgencyServices).
  // Falls back to the es base when no override exists for the locale.
  const localizedServices = mergeAgencyServices(
    (rawAgency.services ?? []) as Array<{
      title: string;
      icon: string;
      color: string | null;
      description: string | null;
    }>,
    agencyTranslation?.services ?? null,
  );

  const [theme, sections, players, staffLicensesRows, countryProfiles, teamRelations] = await Promise.all([
    db.query.agencyThemeSettings.findFirst({
      where: eq(agencyThemeSettings.agencyId, agency.id),
    }),
    db.query.agencySectionsVisibility.findMany({
      where: eq(agencySectionsVisibility.agencyId, agency.id),
    }),
    db
      .select({
        id: playerProfiles.id,
        slug: playerProfiles.slug,
        fullName: playerProfiles.fullName,
        avatarUrl: playerProfiles.avatarUrl,
        positions: playerProfiles.positions,
        currentClub: playerProfiles.currentClub,
        nationality: playerProfiles.nationality,
        marketValueEur: playerProfiles.marketValueEur,
        currentTeamCountryCode: teams.countryCode,
      })
      .from(playerProfiles)
      .leftJoin(teams, eq(teams.id, playerProfiles.currentTeamId))
      .where(
        and(
          eq(playerProfiles.agencyId, agency.id),
          eq(playerProfiles.visibility, "public"),
        ),
      ),
    db
      .select({
        managerId: managerProfiles.id,
        fullName: managerProfiles.fullName,
        licenses: managerProfiles.licenses,
      })
      .from(userProfiles)
      .innerJoin(managerProfiles, eq(managerProfiles.userId, userProfiles.id))
      .where(eq(userProfiles.agencyId, agency.id)),
    db.query.agencyCountryProfiles.findMany({
      where: eq(agencyCountryProfiles.agencyId, agency.id),
    }),
    db.query.agencyTeamRelations.findMany({
      where: eq(agencyTeamRelations.agencyId, agency.id),
    }),
  ]);

  // Localize country narratives (per-country description). Defensive: if the
  // translations table isn't migrated yet the helper returns an empty map → es
  // base passes through.
  const countryProfileTrMap = await getAgencyCountryProfileTranslations(
    countryProfiles.map((p) => p.id),
    locale,
  );
  const localizedCountryProfiles = countryProfiles.map((p) =>
    mergeAgencyCountryProfileContent(p, countryProfileTrMap.get(p.id)),
  );

  // Hydrate teams referenced by relations
  const teamIds = teamRelations.map((r) => r.teamId);
  const relTeams = teamIds.length
    ? await db.query.teams.findMany({
        where: inArray(teams.id, teamIds),
        columns: {
          id: true,
          slug: true,
          name: true,
          country: true,
          countryCode: true,
          crestUrl: true,
          transfermarktUrl: true,
        },
      })
    : [];
  const teamMap = new Map(relTeams.map((t) => [t.id, t]));

  const staffLicenses = staffLicensesRows
    .filter((row) => Array.isArray(row.licenses) && (row.licenses ?? []).length > 0)
    .map((row) => ({
      managerId: row.managerId,
      managerName: row.fullName,
      licenses: (row.licenses ?? []) as Array<{ type: string; number: string; url?: string }>,
    }));

  const data: AgencyPublicData = {
    // Drives the locale switcher inside the Pro header (Classic uses the
    // standalone floating one below). Only locales with a real translation.
    localeSwitch: {
      available: availableLocales,
      current: locale,
      basePath: `/agency/${slug}`,
    },
    agency: {
      id: agency.id,
      slug: agency.slug,
      name: agency.name,
      description: agency.description,
      logoUrl: agency.logoUrl,
      tagline: agency.tagline,
      headquarters: agency.headquarters,
      foundationYear: agency.foundationYear,
      contactEmail: agency.contactEmail,
      contactPhone: agency.contactPhone,
      websiteUrl: agency.websiteUrl,
      verifiedLink: agency.verifiedLink,
      instagramUrl: agency.instagramUrl,
      twitterUrl: agency.twitterUrl,
      linkedinUrl: agency.linkedinUrl,
      operativeCountries: agency.operativeCountries,
      services: localizedServices,
    },
    staffLicenses,
    players: players.map((p) => ({
      id: p.id,
      slug: p.slug,
      fullName: p.fullName,
      avatarUrl: p.avatarUrl,
      positions: p.positions,
      currentClub: p.currentClub,
      nationality: p.nationality,
      marketValueEur: p.marketValueEur ?? null,
      currentTeamCountryCode: p.currentTeamCountryCode ?? null,
    })),
    countryProfiles: localizedCountryProfiles.map((p) => ({
      countryCode: p.countryCode,
      description: p.description,
    })),
    teamRelations: teamRelations
      .map((r) => {
        const team = teamMap.get(r.teamId);
        if (!team) return null;
        return {
          id: r.id,
          relationKind: r.relationKind,
          description: r.description,
          countryCode: r.countryCode ?? team.countryCode ?? null,
          team: {
            id: team.id,
            slug: team.slug,
            name: team.name,
            country: team.country,
            countryCode: team.countryCode,
            crestUrl: team.crestUrl,
            transfermarktUrl: team.transfermarktUrl,
          },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
    sections: sections.map((s) => ({ section: s.section, visible: s.visible })),
    theme: theme
      ? {
          layout: theme.layout,
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          accentColor: theme.accentColor,
          backgroundColor: theme.backgroundColor,
          typography: theme.typography,
          heroHeadline: theme.heroHeadline,
          heroTagline: theme.heroTagline,
        }
      : {
          layout: "classic",
          primaryColor: "#0a0a0a",
          secondaryColor: "#2A2A2A",
          accentColor: "#10b981",
          backgroundColor: "#050505",
          typography: null,
          heroHeadline: null,
          heroTagline: null,
        },
  };

  // Pro layout mounts the switcher inside its header pill; Classic keeps the
  // standalone floating one.
  const isProLayout = data.theme?.layout === "pro";

  return (
    <>
      {!isProLayout ? (
        <PortfolioLocaleSwitcher
          basePath={`/agency/${slug}`}
          available={availableLocales}
          current={locale}
        />
      ) : null}
      {/*
        SportsOrganization JSON-LD. Closes the `worksFor` cross-reference
        that Pro player @graphs emit pointing back at this agency. See
        `src/lib/seo/agencyJsonLd.tsx` for the full shape.
      */}
      <AgencyJsonLd
        locale={locale as Locale}
        agency={{
          slug: agency.slug,
          name: agency.name,
          description: agency.description ?? null,
          logoUrl: agency.logoUrl ?? null,
          websiteUrl: agency.websiteUrl ?? null,
          instagramUrl: agency.instagramUrl ?? null,
          linkedinUrl: agency.linkedinUrl ?? null,
          twitterUrl: agency.twitterUrl ?? null,
          operativeCountries: agency.operativeCountries ?? null,
          foundationYear: agency.foundationYear ?? null,
          contactEmail: agency.contactEmail ?? null,
          players: players.map((p) => ({ slug: p.slug, fullName: p.fullName })),
        }}
      />
      <AgencyLayoutResolver data={data} />
    </>
  );
}
