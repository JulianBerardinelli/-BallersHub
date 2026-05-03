// Central source-of-truth for the pricing page.
// Mirrors `docs/pricing-matrix.md`. When the doc changes, update here.

export type Audience = "player" | "agency";
export type Currency = "USD" | "ARS" | "EUR";
export type PlanTier = "free" | "pro";
export type PlanId = `${PlanTier}-${Audience}`;

// Currency glyph used in card price blocks. Argentine pesos and US dollars
// share the dollar sign — disambiguated by the explicit currency code label.
export const CURRENCY_GLYPH: Record<Currency, string> = {
  USD: "$",
  ARS: "$",
  EUR: "€",
};

// --------------------------------------------------------------------
// Accent colour per audience.
// Player → Electric Lime  ·  Agency → Electric Blue.
// All audience-aware UI (cards, buttons, comparison table, detail panel)
// reads these classes so the page repaints when the audience toggle flips.
// --------------------------------------------------------------------

export type AccentColor = "lime" | "blue";

export type AccentClasses = {
  /** Solid foreground colour. */
  text: string;
  /** Solid background — used for primary CTAs. */
  bg: string;
  /** Hover background tweak for the primary CTA. */
  hoverBg: string;
  /** Drop shadow for primary CTA. */
  shadow: string;
  /** Drop shadow on hover. */
  hoverShadow: string;
  /** Strong-tinted border (e.g. badges, pills, focus rings). */
  borderStrong: string;
  /** Soft-tinted border (icons, surrounds). */
  borderSoft: string;
  /** Translucent background — for icon wells, soft buttons. */
  bgSoft: string;
  /** Slightly more opaque background — for badges. */
  bgBadge: string;
  /** Faint background — used for column tints in the comparison table (~3%). */
  bgColumnTint: string;
  /** Slightly less faint background — used for header cells (~6%). */
  bgVeryFaint: string;
  /** Shimmer class to apply on display headlines / prices. */
  shimmerClass: string;
};

const LIME: AccentClasses = {
  text: "text-bh-lime",
  bg: "bg-bh-lime",
  hoverBg: "hover:bg-[#d8ff26]",
  shadow: "shadow-[0_2px_12px_rgba(204,255,0,0.35)]",
  hoverShadow: "hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]",
  borderStrong: "border-[rgba(204,255,0,0.35)]",
  borderSoft: "border-[rgba(204,255,0,0.22)]",
  bgSoft: "bg-[rgba(204,255,0,0.10)]",
  bgBadge: "bg-[rgba(204,255,0,0.12)]",
  bgColumnTint: "bg-[rgba(204,255,0,0.03)]",
  bgVeryFaint: "bg-[rgba(204,255,0,0.06)]",
  shimmerClass: "bh-text-shimmer",
};

const BLUE: AccentClasses = {
  text: "text-bh-blue",
  bg: "bg-bh-blue",
  hoverBg: "hover:bg-[#33ceff]",
  shadow: "shadow-[0_2px_12px_rgba(0,194,255,0.35)]",
  hoverShadow: "hover:shadow-[0_6px_24px_rgba(0,194,255,0.35)]",
  borderStrong: "border-[rgba(0,194,255,0.35)]",
  borderSoft: "border-[rgba(0,194,255,0.22)]",
  bgSoft: "bg-[rgba(0,194,255,0.10)]",
  bgBadge: "bg-[rgba(0,194,255,0.12)]",
  bgColumnTint: "bg-[rgba(0,194,255,0.03)]",
  bgVeryFaint: "bg-[rgba(0,194,255,0.06)]",
  shimmerClass: "bh-text-shimmer-blue",
};

export function audienceAccent(audience: Audience): AccentColor {
  return audience === "agency" ? "blue" : "lime";
}

export function accentClasses(accent: AccentColor): AccentClasses {
  return accent === "blue" ? BLUE : LIME;
}

export type PriceConfig = {
  /** Annual total in this currency, integer (no decimals at the unit). */
  annual: number;
  /** Pre-formatted "/mes" display string (annual / 12, locally formatted). */
  perMonthDisplay: string;
  /** Pre-formatted annual display string (locally formatted). */
  annualDisplay: string;
  /** Currency prefix label (e.g. "USD", "ARS", "EUR"). */
  symbol: string;
};

export type Feature = { label: string; included: boolean };

export type Plan = {
  id: PlanId;
  audience: Audience;
  tier: PlanTier;
  /** Plan label shown in cards. */
  name: string;
  tagline: string;
  description: string;
  /** null when the plan is free. */
  pricing: Record<Currency, PriceConfig> | null;
  /** Curated feature list shown in the card (mix of included/excluded). */
  features: Feature[];
  ctaLabel: string;
  ctaHref: string;
  /** Visual highlight for "the plan we want users to pick". */
  highlight?: boolean;
  badge?: string;
};

// --------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------

const ARS_FORMATTER = new Intl.NumberFormat("es-AR");
const EUR_FORMATTER = new Intl.NumberFormat("de-DE");
const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function makePrice(currency: Currency, annual: number): PriceConfig {
  if (currency === "ARS") {
    const perMonth = Math.round(annual / 12);
    return {
      annual,
      perMonthDisplay: ARS_FORMATTER.format(perMonth),
      annualDisplay: ARS_FORMATTER.format(annual),
      symbol: "ARS",
    };
  }
  if (currency === "EUR") {
    const perMonth = annual / 12;
    return {
      annual,
      perMonthDisplay: USD_FORMATTER.format(perMonth),
      annualDisplay: EUR_FORMATTER.format(annual),
      symbol: "EUR",
    };
  }
  // USD
  const perMonth = annual / 12;
  return {
    annual,
    perMonthDisplay: USD_FORMATTER.format(perMonth),
    annualDisplay: String(annual),
    symbol: "USD",
  };
}

// --------------------------------------------------------------------
// Pricing tables (per audience)
// --------------------------------------------------------------------

export const PRO_PLAYER_PRICES: Record<Currency, PriceConfig> = {
  USD: makePrice("USD", 85),
  ARS: makePrice("ARS", 131_999),
  EUR: makePrice("EUR", 73),
};

// NOTE: Agency prices are placeholders proportional to Player prices.
// Pending owner confirmation — see docs/pricing-matrix.md §8.
export const PRO_AGENCY_PRICES: Record<Currency, PriceConfig> = {
  USD: makePrice("USD", 169),
  ARS: makePrice("ARS", 264_999),
  EUR: makePrice("EUR", 146),
};

// --------------------------------------------------------------------
// Plans
// --------------------------------------------------------------------

export const PLANS: Plan[] = [
  // ------------------------ PLAYER ------------------------
  {
    id: "free-player",
    audience: "player",
    tier: "free",
    name: "Free",
    tagline: "Empezá tu identidad",
    description:
      "Construí tu perfil esencial con identidad verificable. Lo necesario para que clubes y agentes te encuentren.",
    pricing: null,
    features: [
      { label: "Perfil profesional verificado", included: true },
      { label: "URL pública personalizable", included: true },
      { label: "Plantilla default", included: true },
      { label: "2 videos de YouTube · 3 redes · 3 noticias", included: true },
      { label: "2 solicitudes de corrección por rubro / semana", included: true },
      { label: "Plantilla Pro Portfolio (motions + assets)", included: false },
      { label: "Galería catálogo (5 imágenes)", included: false },
      { label: "Valores de mercado, valoraciones y logros", included: false },
      { label: "Reviews y contactos de referencia", included: false },
    ],
    ctaLabel: "Empezar gratis",
    ctaHref: "/auth/sign-up?audience=player&plan=free",
  },
  {
    id: "pro-player",
    audience: "player",
    tier: "pro",
    name: "Pro",
    tagline: "Visibilidad real",
    description:
      "Plantilla pro, multimedia ilimitada y la información completa para impulsar tu próxima transferencia.",
    pricing: PRO_PLAYER_PRICES,
    features: [
      { label: "Todo lo del Free", included: true },
      { label: "Plantilla Pro Portfolio (motions + assets pro)", included: true },
      { label: "Galería catálogo de 5 imágenes", included: true },
      { label: "Videos · redes · noticias ilimitados", included: true },
      { label: "Valores de mercado, valoraciones y logros", included: true },
      { label: "Reviews con invitación", included: true },
      { label: "Contactos de referencia", included: true },
      { label: "5 solicitudes de corrección por rubro / semana", included: true },
      { label: "Soporte humano prioritario", included: true },
      { label: "SEO Pro (schema, sitemap, OG dinámico)", included: true },
    ],
    ctaLabel: "Probar 7 días gratis",
    ctaHref: "/auth/sign-up?audience=player&plan=pro",
    highlight: true,
    badge: "Más elegido",
  },

  // ------------------------ AGENCY ------------------------
  {
    id: "free-agency",
    audience: "agency",
    tier: "free",
    name: "Free",
    tagline: "Mostrá tu agencia",
    description:
      "Presencia esencial para tu agencia. Cartera limitada y plantilla default para empezar a operar.",
    pricing: null,
    features: [
      { label: "URL pública personalizable", included: true },
      { label: "Plantilla default", included: true },
      { label: "Hasta 2 members del equipo (incluye owner)", included: true },
      { label: "Cartera de hasta 5 jugadores representados", included: true },
      { label: "2 solicitudes de corrección por rubro / semana", included: true },
      { label: "Plantilla Pro Portfolio (versión agency)", included: false },
      { label: "Members ilimitados", included: false },
      { label: "5 slots de Pro otorgables a representados", included: false },
      { label: "Reviews y contactos de referencia", included: false },
    ],
    ctaLabel: "Crear cuenta gratis",
    ctaHref: "/auth/sign-up?audience=agency&plan=free",
  },
  {
    id: "pro-agency",
    audience: "agency",
    tier: "pro",
    name: "Pro",
    tagline: "Stack profesional",
    description:
      "Cartera ilimitada, equipo sin límites y 5 slots de Pro Player para tus representados. El stack completo de la agencia.",
    pricing: PRO_AGENCY_PRICES,
    features: [
      { label: "Todo lo del Free Agency", included: true },
      { label: "Plantilla Pro Portfolio (versión agency)", included: true },
      { label: "Members del equipo ilimitados", included: true },
      { label: "Cartera ilimitada de jugadores representados", included: true },
      { label: "5 slots de Pro Player para tus representados", included: true },
      { label: "Galería catálogo de 5 imágenes", included: true },
      { label: "Reviews con invitación", included: true },
      { label: "Contactos de referencia", included: true },
      { label: "Soporte humano prioritario", included: true },
      { label: "SEO Pro", included: true },
    ],
    ctaLabel: "Probar 7 días gratis",
    ctaHref: "/auth/sign-up?audience=agency&plan=pro",
    highlight: true,
    badge: "Recomendado",
  },
];

export function plansFor(audience: Audience): Plan[] {
  return PLANS.filter((p) => p.audience === audience);
}

export function planById(id: PlanId): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}
