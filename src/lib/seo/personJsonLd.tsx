// Per-player JSON-LD: Person + SportsTeam affiliation.
//
// This is the SEO differentiator that lets 'BallersHub compete in the
// SERP against Transfermarkt/Besoccer. We emit a rich `Person` entity
// with `sameAs` linking out to the player's other authoritative
// profiles (Transfermarkt, BeSoccer, Instagram, etc.) and structured
// facts (birthDate, height, nationality, current club) so Google can
// resolve the player as the same real-world entity across sites.
//
// Locale-aware (F5.2c): jobTitle, position labels (knowsAbout), the
// breadcrumb home label, the canonical/@id URLs and inLanguage all follow
// the page locale, so `/en/<slug>` declares `Footballer` + `inLanguage: en`
// rather than the es-AR defaults (HANDOFF §8). The `bio`/description is
// already localized by the route before it reaches this component.
//
// Tier gating (pricing matrix §E):
//   • Free → minimal Person (name, url, image, nationality, jobTitle).
//   • Pro / pro_plus → full @graph with Person + SportsTeam +
//     SportsOrganization (agency), cross-referenced via @id.

import { toCanonicalUrl, getSiteBaseUrl } from "./baseUrl";
import type { Locale } from "@/i18n/routing";
import { HTML_LANG } from "@/i18n/config";
import { resolveAllPositions } from "@/lib/scouting/taxonomies";

type PlanTier = "free" | "pro" | "pro_plus";

export type PersonJsonLdPlayer = {
  slug: string;
  fullName: string;
  bio: string | null;
  avatarUrl: string | null;
  birthDate: string | null; // ISO date, e.g. "1995-03-12"
  nationality: string[] | null;
  nationalityCodes: string[] | null; // ISO 3166-1 alpha-2, e.g. ["AR", "IT"]
  heightCm: number | null;
  weightKg: number | null;
  positions: string[] | null;
  currentClub: string | null;
  transfermarktUrl: string | null;
  beSoccerUrl: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  youtubeUrl?: string | null;
  tiktokUrl?: string | null;
  agency?: { name: string; slug: string } | null;
  authorHubSlug?: string | null;
};

type Props = {
  player: PersonJsonLdPlayer;
  plan: PlanTier;
  locale: Locale;
};

const JOB_TITLE: Record<Locale, string> = {
  es: "Futbolista",
  en: "Footballer",
  it: "Calciatore",
  pt: "Futebolista",
};

const HOME_LABEL: Record<Locale, string> = {
  es: "Inicio",
  en: "Home",
  it: "Home",
  pt: "Início",
};

// Position codes → full label per locale (knowsAbout). Keyed by the canonical
// codes that `resolveAllPositions` (scouting taxonomy) emits, so a player's
// messy free-text `positions` (codes like "EI", Spanish labels like "Extremo
// izquierdo", or a parent role like "DEL") all resolve to a localized label.
// Covers the full scouting code space; falls back to the resolved Spanish label
// for any unmapped code — a clean human label beats a raw code.
const POSITION_LABELS: Record<Locale, Record<string, string>> = {
  es: {
    POR: "Arquero", ARQ: "Arquero", DFC: "Defensor central",
    LD: "Lateral derecho", LI: "Lateral izquierdo", CAR: "Carrilero",
    MC: "Mediocampista central", MCD: "Mediocampista defensivo",
    MCO: "Mediocampista ofensivo", INT: "Interior",
    MD: "Volante derecho", MI: "Volante izquierdo",
    ED: "Extremo derecho", EI: "Extremo izquierdo", DC: "Delantero centro",
    SD: "Segundo delantero",
  },
  en: {
    POR: "Goalkeeper", ARQ: "Goalkeeper", DFC: "Center back",
    LD: "Right back", LI: "Left back", CAR: "Wing-back",
    MC: "Central midfielder", MCD: "Defensive midfielder",
    MCO: "Attacking midfielder", INT: "Inside midfielder",
    MD: "Right midfielder", MI: "Left midfielder",
    ED: "Right winger", EI: "Left winger", DC: "Striker",
    SD: "Second striker",
  },
  it: {
    POR: "Portiere", ARQ: "Portiere", DFC: "Difensore centrale",
    LD: "Terzino destro", LI: "Terzino sinistro", CAR: "Tornante",
    MC: "Centrocampista centrale", MCD: "Mediano",
    MCO: "Trequartista", INT: "Mezzala",
    MD: "Centrocampista destro", MI: "Centrocampista sinistro",
    ED: "Esterno destro", EI: "Esterno sinistro", DC: "Centravanti",
    SD: "Seconda punta",
  },
  pt: {
    POR: "Goleiro", ARQ: "Goleiro", DFC: "Zagueiro",
    LD: "Lateral direito", LI: "Lateral esquerdo", CAR: "Ala",
    MC: "Meio-campo central", MCD: "Volante",
    MCO: "Meia-atacante", INT: "Meia interior",
    MD: "Meia direita", MI: "Meia esquerda",
    ED: "Ponta direita", EI: "Ponta esquerda", DC: "Centroavante",
    SD: "Segundo atacante",
  },
};

function buildSameAs(p: PersonJsonLdPlayer): string[] {
  const base = getSiteBaseUrl();
  const sameAs: Array<string | null | undefined> = [
    p.transfermarktUrl,
    p.beSoccerUrl,
    p.instagramUrl,
    p.twitterUrl,
    p.youtubeUrl,
    p.tiktokUrl,
  ];
  if (p.authorHubSlug) {
    sameAs.push(`${base}/blog/authors/${p.authorHubSlug}`);
  }
  return sameAs.filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
}

function buildKnowsAbout(
  positions: string[] | null | undefined,
  locale: Locale,
): string[] {
  if (!positions || positions.length === 0) return [];
  const labels = POSITION_LABELS[locale];
  // `positions` is messy free-text: a parent role (ARQ/DEF/MID/DEL) mixed with
  // sub-position codes ("EI") AND Spanish labels ("Extremo izquierdo").
  // `resolveAllPositions` (scouting taxonomy) normalizes all of that to
  // canonical codes and drops the redundant parent role, so we can map each
  // code → localized label. Before this, a stored label ("Mediapunta") or a
  // raw role code ("DEL") leaked verbatim into EVERY locale — never translating.
  const out: string[] = [];
  const seen = new Set<string>();
  for (const pos of resolveAllPositions(positions)) {
    const label = labels[pos.code] ?? pos.label;
    if (label && !seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

export function PersonJsonLd({ player, plan, locale }: Props) {
  const isPro = plan === "pro" || plan === "pro_plus";
  // Self-referential canonical per locale (es has no prefix).
  const localePath =
    locale === "es" ? `/${player.slug}` : `/${locale}/${player.slug}`;
  const canonical = toCanonicalUrl(localePath);
  const base = getSiteBaseUrl();
  const lang = HTML_LANG[locale];

  const personId = `${canonical}#person`;
  const realImage = player.avatarUrl ? toCanonicalUrl(player.avatarUrl) : null;

  const personBase = {
    "@type": "Person",
    "@id": personId,
    name: player.fullName,
    url: canonical,
    ...(realImage && { image: realImage }),
    jobTitle: JOB_TITLE[locale],
    ...(player.birthDate && { birthDate: player.birthDate }),
    ...(player.nationality &&
      player.nationality.length > 0 && {
        nationality: player.nationality.map((country, idx) => ({
          "@type": "Country",
          name: country,
          ...(player.nationalityCodes?.[idx] && {
            identifier: player.nationalityCodes[idx].toUpperCase(),
          }),
        })),
      }),
    ...(player.bio && { description: player.bio }),
  };

  if (!isPro) {
    const free = {
      "@context": "https://schema.org",
      ...personBase,
      ...(player.positions &&
        player.positions.length > 0 && {
          knowsAbout: buildKnowsAbout(player.positions, locale),
        }),
    };
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(free) }}
      />
    );
  }

  const sameAs = buildSameAs(player);
  const teamId = player.currentClub ? `${canonical}#current-team` : null;
  const agencyId = player.agency
    ? toCanonicalUrl(`/agency/${player.agency.slug}#organization`)
    : null;

  const heightQty =
    player.heightCm && Number.isFinite(player.heightCm)
      ? { "@type": "QuantitativeValue", value: player.heightCm, unitCode: "CMT" }
      : null;
  const weightQty =
    player.weightKg && Number.isFinite(player.weightKg)
      ? { "@type": "QuantitativeValue", value: player.weightKg, unitCode: "KGM" }
      : null;

  const graph: Record<string, unknown>[] = [
    {
      ...personBase,
      ...(sameAs.length > 0 && { sameAs }),
      ...(buildKnowsAbout(player.positions, locale).length > 0 && {
        knowsAbout: buildKnowsAbout(player.positions, locale),
      }),
      ...(heightQty && { height: heightQty }),
      ...(weightQty && { weight: weightQty }),
      ...(teamId && {
        memberOf: { "@id": teamId },
        affiliation: { "@id": teamId },
      }),
      ...(agencyId && {
        worksFor: { "@id": agencyId },
      }),
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonical,
        inLanguage: lang,
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
      },
    },
    ...(teamId && player.currentClub
      ? [
          {
            "@type": "SportsTeam",
            "@id": teamId,
            name: player.currentClub,
            sport: "Association football",
          },
        ]
      : []),
    ...(agencyId && player.agency
      ? [
          {
            "@type": "SportsOrganization",
            "@id": agencyId,
            name: player.agency.name,
            url: toCanonicalUrl(`/agency/${player.agency.slug}`),
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
          name: player.fullName,
          item: canonical,
        },
      ],
    },
  ];

  const pro = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(pro) }}
    />
  );
}
