// Per-player JSON-LD: Person + SportsTeam affiliation.
//
// This is the SEO differentiator that lets BallersHub compete in the
// SERP against Transfermarkt/Besoccer. We emit a rich `Person` entity
// with `sameAs` linking out to the player's other authoritative
// profiles (Transfermarkt, BeSoccer, Instagram, etc.) and structured
// facts (birthDate, height, nationality, current club) so Google can
// resolve the player as the same real-world entity across sites.
//
// Tier gating (pricing matrix §E):
//
//   • Free → minimal Person (name, url, image, nationality, jobTitle).
//     No sameAs to competitors, no affiliation/memberOf — the lean
//     payload still helps the page rank for the player's exact name
//     but doesn't give Google enough to link out to other sites.
//
//   • Pro / pro_plus → full @graph with Person + SportsTeam +
//     SportsOrganization (agency), cross-referenced via @id. sameAs
//     enumerates every external profile the player has registered.
//
// Mounted from `[slug]/page.tsx` after data fetching, server-rendered
// so the JSON-LD is in the initial HTML response.

import { toCanonicalUrl, getSiteBaseUrl } from "./baseUrl";

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
};

type Props = {
  player: PersonJsonLdPlayer;
  plan: PlanTier;
};

/**
 * Map position codes to Spanish full names for `knowsAbout`. Spanish
 * matches `inLanguage: es-AR` declared in the sitewide WebSite schema
 * and avoids the previous English-on-Spanish-locale inconsistency
 * flagged by the schema audit. Falls back to the original code if
 * unknown — a meaningful free-text value beats nothing.
 */
const POSITION_LABELS: Record<string, string> = {
  POR: "Arquero",
  ARQ: "Arquero",
  DFC: "Defensor central",
  LD: "Lateral derecho",
  LI: "Lateral izquierdo",
  MC: "Mediocampista central",
  MCD: "Mediocampista defensivo",
  MCO: "Mediocampista ofensivo",
  ED: "Extremo derecho",
  EI: "Extremo izquierdo",
  DC: "Delantero centro",
  SD: "Segundo delantero",
};

function buildSameAs(p: PersonJsonLdPlayer): string[] {
  return [
    p.transfermarktUrl,
    p.beSoccerUrl,
    p.instagramUrl,
    p.twitterUrl,
    p.youtubeUrl,
    p.tiktokUrl,
  ].filter((v): v is string => typeof v === "string" && v.length > 0);
}

function buildKnowsAbout(positions: string[] | null | undefined): string[] {
  if (!positions || positions.length === 0) return [];
  return positions.map((p) => POSITION_LABELS[p] ?? p);
}

export function PersonJsonLd({ player, plan }: Props) {
  const isPro = plan === "pro" || plan === "pro_plus";
  const canonical = toCanonicalUrl(`/${player.slug}`);
  const base = getSiteBaseUrl();

  // Both tiers share these properties. Keeping the Free payload lean is
  // deliberate — it still wins the player's exact-name query but doesn't
  // hand competitors a free graph to scrape.
  const personId = `${canonical}#person`;
  // Only emit `image` when we have a real avatar. Google's Rich Results
  // Test penalizes generic placeholder images as low-quality — better
  // to omit the property entirely than to emit a default silhouette.
  const realImage = player.avatarUrl ? toCanonicalUrl(player.avatarUrl) : null;

  const personBase = {
    "@type": "Person",
    "@id": personId,
    name: player.fullName,
    url: canonical,
    ...(realImage && { image: realImage }),
    jobTitle: "Futbolista",
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
    // Free tier — minimal Person, no graph nesting, no sameAs to
    // competitor sites.
    const free = {
      "@context": "https://schema.org",
      ...personBase,
      ...(player.positions &&
        player.positions.length > 0 && {
          knowsAbout: buildKnowsAbout(player.positions),
        }),
    };
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(free) }}
      />
    );
  }

  // Pro tier — full @graph. Cross-references via @id let Google merge
  // the Person ↔ Team ↔ Agency triangle.
  const sameAs = buildSameAs(player);
  const teamId = player.currentClub
    ? `${canonical}#current-team`
    : null;
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
      ...(buildKnowsAbout(player.positions).length > 0 && {
        knowsAbout: buildKnowsAbout(player.positions),
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
      // BreadcrumbList lives in the same @graph for crawl economy.
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonical,
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
          name: "Inicio",
          item: base,
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
