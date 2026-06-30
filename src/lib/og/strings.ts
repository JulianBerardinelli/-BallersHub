// OG card copy, per language. Mirrors `OG_STRINGS` in the design handoff.
// The site has 7 locales but the cards are authored in es/en; every
// non-es locale falls back to the English card (international default).

export type OgStrings = {
  verifiedTag: string;
  profileEyebrow: string;
  foot: Record<string, string>;
  age: string;
  homeEyebrow: string;
  homeTitle: [string, string, string];
  homeStats: [string, string][];
  playersEyebrow: string;
  playersTitle: [string, string];
  playersSub: string;
  playersCount: string;
  pricingEyebrow: string;
  pricingTitle: [string, string, string];
  free: string;
  freeDesc: string;
  freePrice: string;
  pro: string;
  proTag: string;
  proDesc: string;
  proPrice: string;
};

const es: OgStrings = {
  verifiedTag: "Perfil verificado",
  profileEyebrow: "Perfil de jugador",
  foot: {
    Derecho: "Pie derecho",
    Izquierdo: "Pie izquierdo",
    Ambidiestro: "Ambidiestro",
    right: "Pie derecho",
    left: "Pie izquierdo",
    both: "Ambidiestro",
  },
  age: "años",
  homeEyebrow: "El ecosistema digital del fútbol profesional",
  homeTitle: ["El hub donde el ", "talento", " del fútbol gana visibilidad real."],
  homeStats: [
    ["+30", "Perfiles verificados"],
    ["+130", "Clubes activos"],
    ["4.8/5", "Referencias"],
  ],
  playersEyebrow: "Red global de talento",
  playersTitle: ["Jugadores de todo el mundo, en un solo ", "hub"],
  playersSub:
    "Cada perfil es verificado: identidad, carrera y referencias confirmadas por nuestro equipo.",
  playersCount: "+30 perfiles verificados",
  pricingEyebrow: "Planes y precios",
  pricingTitle: ["Elegí el plan que ", "acelera", " tu carrera"],
  free: "Gratis",
  freeDesc: "Tu perfil esencial con identidad verificable.",
  freePrice: "Para siempre",
  pro: "Pro",
  proTag: "El más elegido",
  proDesc: "Plantilla Pro, media ilimitada e info completa.",
  proPrice: "USD/mes",
};

const en: OgStrings = {
  verifiedTag: "Verified profile",
  profileEyebrow: "Player profile",
  foot: {
    Derecho: "Right footed",
    Izquierdo: "Left footed",
    Ambidiestro: "Two footed",
    right: "Right footed",
    left: "Left footed",
    both: "Two footed",
  },
  age: "yrs",
  homeEyebrow: "The digital ecosystem of professional football",
  homeTitle: ["The hub where football ", "talent", " gains real visibility."],
  homeStats: [
    ["+30", "Verified profiles"],
    ["+130", "Active clubs"],
    ["4.8/5", "References"],
  ],
  playersEyebrow: "Global talent network",
  playersTitle: ["Players from around the world, in a single ", "hub"],
  playersSub:
    "Every profile is verified: identity, career and references confirmed by our team.",
  playersCount: "+30 verified profiles",
  pricingEyebrow: "Plans & pricing",
  pricingTitle: ["Pick the plan that ", "accelerates", " your career"],
  free: "Free",
  freeDesc: "Your essential profile with verifiable identity.",
  freePrice: "Forever",
  pro: "Pro",
  proTag: "Most picked",
  proDesc: "Pro template, unlimited media and complete info.",
  proPrice: "USD/mo",
};

export function ogStrings(locale: string): OgStrings {
  return locale === "es" ? es : en;
}
