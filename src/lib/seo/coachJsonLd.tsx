// Per-coach JSON-LD: Person (Director Técnico) + credentials + awards.
//
// The SEO/GEO differentiator for the coaches vertical. We emit a rich
// `Person` entity so Google and AI engines can resolve the DT as a named
// real-world entity and CITE concrete, structured facts:
//   • hasCredential → EducationalOccupationalCredential[] for each APPROVED
//     coaching license (UEFA Pro, etc.) — the platform's verified-credential
//     value prop, machine-readable.
//   • award → the honours/palmarés titles.
//   • worksFor / memberOf → the current SportsTeam.
//   • knowsAbout → preferred formations (tactical systems).
//   • sameAs → Transfermarkt + the coach's other authoritative profiles.
//
// Locale-aware like personJsonLd (jobTitle, breadcrumb label, @id/canonical,
// inLanguage follow the page locale). bio/description is already localized by
// the route before it reaches this component.
//
// Tier gating (parity with players):
//   • Free → minimal Person (name, url, image, jobTitle, nationality,
//     description, knowsAbout).
//   • Pro  → full @graph: Person + SportsTeam + SportsOrganization (agency) +
//     BreadcrumbList, cross-referenced via @id, with hasCredential + award.

import { toCanonicalUrl, getSiteBaseUrl } from "./baseUrl";
import type { Locale } from "@/i18n/routing";
import { HTML_LANG } from "@/i18n/config";

type PlanTier = "free" | "pro" | "pro_plus";

export type CoachLicense = {
  title: string;
  issuer: string | null;
  year: number | null;
};

export type CoachJsonLdData = {
  slug: string;
  fullName: string;
  bio: string | null;
  avatarUrl: string | null;
  birthDate: string | null; // ISO date
  nationality: string[] | null;
  nationalityCodes: string[] | null; // ISO 3166-1 alpha-2
  roleTitle: string | null; // free text: "Director Técnico", "Asistente"...
  currentClub: string | null;
  coachingSince: number | null;
  preferredFormations: string[] | null; // ["4-3-3", "3-5-2"]
  transfermarktUrl: string | null;
  socials?: string[] | null; // resolved coach_links urls (ig/x/yt/linkedin...)
  agency?: { name: string; slug: string } | null;
  licenses?: CoachLicense[] | null; // APPROVED only — filtered by the route
  honours?: string[] | null; // award titles
  // Aggregate coaching record (matches managed + win %). Emitted as
  // additionalProperty so Google/AI engines can cite the verified record.
  record?: { matches: number; winPct: number } | null;
};

type Props = {
  coach: CoachJsonLdData;
  plan: PlanTier;
  locale: Locale;
};

// Default jobTitle per locale (used when the free-text roleTitle is empty).
const JOB_TITLE: Record<Locale, string> = {
  es: "Director Técnico",
  en: "Football Manager",
  it: "Allenatore",
  pt: "Treinador de Futebol",
  de: "Trainer",
  fr: "Entraîneur",
  fi: "Valmentaja",
};

const HOME_LABEL: Record<Locale, string> = {
  es: "Inicio",
  en: "Home",
  it: "Home",
  pt: "Início",
  de: "Startseite",
  fr: "Accueil",
  fi: "Etusivu",
};

function buildSameAs(c: CoachJsonLdData): string[] {
  const sameAs: Array<string | null | undefined> = [c.transfermarktUrl, ...(c.socials ?? [])];
  return sameAs.filter((v): v is string => typeof v === "string" && v.length > 0);
}

function buildCredentials(licenses: CoachLicense[] | null | undefined) {
  if (!licenses || licenses.length === 0) return [];
  return licenses
    .filter((l) => l.title && l.title.trim().length > 0)
    .map((l) => ({
      "@type": "EducationalOccupationalCredential",
      name: l.title,
      credentialCategory: "license",
      ...(l.issuer && {
        recognizedBy: { "@type": "Organization", name: l.issuer },
      }),
      ...(l.year && { dateCreated: String(l.year) }),
    }));
}

export function CoachJsonLd({ coach, plan, locale }: Props) {
  const isPro = plan === "pro" || plan === "pro_plus";
  const localePath = locale === "es" ? `/coach/${coach.slug}` : `/${locale}/coach/${coach.slug}`;
  const canonical = toCanonicalUrl(localePath);
  const base = getSiteBaseUrl();
  const lang = HTML_LANG[locale];

  const personId = `${canonical}#person`;
  const realImage = coach.avatarUrl ? toCanonicalUrl(coach.avatarUrl) : null;
  const jobTitle = coach.roleTitle?.trim() ? coach.roleTitle.trim() : JOB_TITLE[locale];
  const knowsAbout =
    coach.preferredFormations && coach.preferredFormations.length > 0
      ? coach.preferredFormations
      : null;

  const recordProps =
    coach.record && coach.record.matches > 0
      ? [
          { "@type": "PropertyValue", name: "Matches managed", value: coach.record.matches },
          { "@type": "PropertyValue", name: "Win rate", value: `${coach.record.winPct}%` },
        ]
      : null;

  const personBase = {
    "@type": "Person",
    "@id": personId,
    name: coach.fullName,
    url: canonical,
    ...(realImage && { image: realImage }),
    jobTitle,
    ...(recordProps && { additionalProperty: recordProps }),
    ...(coach.birthDate && { birthDate: coach.birthDate }),
    ...(coach.nationality &&
      coach.nationality.length > 0 && {
        nationality: coach.nationality.map((country, idx) => ({
          "@type": "Country",
          name: country,
          ...(coach.nationalityCodes?.[idx] && {
            identifier: coach.nationalityCodes[idx].toUpperCase(),
          }),
        })),
      }),
    ...(coach.bio && { description: coach.bio }),
  };

  if (!isPro) {
    const free = {
      "@context": "https://schema.org",
      ...personBase,
      ...(knowsAbout && { knowsAbout }),
    };
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(free) }}
      />
    );
  }

  const sameAs = buildSameAs(coach);
  const credentials = buildCredentials(coach.licenses);
  const awards = (coach.honours ?? []).filter((h) => h && h.trim().length > 0);
  const teamId = coach.currentClub ? `${canonical}#current-team` : null;
  const agencyId = coach.agency
    ? toCanonicalUrl(`/agency/${coach.agency.slug}#organization`)
    : null;

  const graph: Record<string, unknown>[] = [
    {
      ...personBase,
      ...(sameAs.length > 0 && { sameAs }),
      ...(knowsAbout && { knowsAbout }),
      ...(credentials.length > 0 && { hasCredential: credentials }),
      ...(awards.length > 0 && { award: awards }),
      // Un DT trabaja para el CLUB (worksFor/memberOf = team). La agencia que lo
      // representa va como affiliation (no worksFor — eso es el club).
      ...(teamId && {
        worksFor: { "@id": teamId },
        memberOf: { "@id": teamId },
      }),
      ...(agencyId && { affiliation: { "@id": agencyId } }),
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonical,
        inLanguage: lang,
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
      },
    },
    ...(teamId && coach.currentClub
      ? [
          {
            "@type": "SportsTeam",
            "@id": teamId,
            name: coach.currentClub,
            sport: "Association football",
            coach: { "@id": personId },
          },
        ]
      : []),
    ...(agencyId && coach.agency
      ? [
          {
            "@type": "SportsOrganization",
            "@id": agencyId,
            name: coach.agency.name,
            url: toCanonicalUrl(`/agency/${coach.agency.slug}`),
          },
        ]
      : []),
    {
      "@type": "BreadcrumbList",
      "@id": `${canonical}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: HOME_LABEL[locale],
          item: locale === "es" ? base : `${base}/${locale}`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: coach.fullName,
          item: canonical,
        },
      ],
    },
  ];

  const pro = { "@context": "https://schema.org", "@graph": graph };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(pro) }}
    />
  );
}
