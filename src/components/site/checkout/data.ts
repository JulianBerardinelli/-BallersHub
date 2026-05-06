// Static data for the checkout UI: country list with their default currency
// + tax-id type, and the resume copy per plan.

import type { CheckoutPlanId, CheckoutCurrency } from "@/lib/billing/plans";

export type CountryOption = {
  code: string; // ISO-2
  name: string;
  defaultCurrency: CheckoutCurrency;
  taxIdType?: "dni" | "cuit" | "cuil" | "nie" | "nif" | "vat" | "other";
  taxIdLabel?: string;
};

// Limited list for v1 — covers the markets we explicitly target. Other
// countries fall through with USD + no tax-id requirement.
export const COUNTRIES: CountryOption[] = [
  { code: "AR", name: "Argentina", defaultCurrency: "ARS", taxIdType: "dni", taxIdLabel: "DNI / CUIT" },
  { code: "ES", name: "España", defaultCurrency: "EUR", taxIdType: "nif", taxIdLabel: "NIF / NIE" },
  { code: "MX", name: "México", defaultCurrency: "USD", taxIdType: "other", taxIdLabel: "RFC" },
  { code: "CO", name: "Colombia", defaultCurrency: "USD", taxIdType: "other", taxIdLabel: "Cédula" },
  { code: "CL", name: "Chile", defaultCurrency: "USD", taxIdType: "other", taxIdLabel: "RUT" },
  { code: "UY", name: "Uruguay", defaultCurrency: "USD", taxIdType: "other", taxIdLabel: "CI" },
  { code: "PE", name: "Perú", defaultCurrency: "USD", taxIdType: "other", taxIdLabel: "DNI" },
  { code: "BR", name: "Brasil", defaultCurrency: "USD", taxIdType: "other", taxIdLabel: "CPF / CNPJ" },
  { code: "US", name: "Estados Unidos", defaultCurrency: "USD" },
  { code: "GB", name: "Reino Unido", defaultCurrency: "USD", taxIdType: "vat", taxIdLabel: "VAT" },
  { code: "FR", name: "Francia", defaultCurrency: "EUR", taxIdType: "vat", taxIdLabel: "VAT" },
  { code: "IT", name: "Italia", defaultCurrency: "EUR", taxIdType: "vat", taxIdLabel: "VAT" },
];

export type CheckoutPlanCopy = {
  name: string;
  tagline: string;
  audienceLabel: string;
  features: string[];
};

export const PLAN_COPY: Record<CheckoutPlanId, CheckoutPlanCopy> = {
  "pro-player": {
    name: "Pro Player",
    tagline: "Visibilidad real ante clubes",
    audienceLabel: "Para jugadores",
    features: [
      "Plantilla Pro Portfolio (motions + assets pro)",
      "Galería catálogo de 5 imágenes",
      "Videos · redes · noticias ilimitados",
      "Valores de mercado, valoraciones y logros",
      "Reviews con invitación",
      "Contactos de referencia",
      "Soporte humano prioritario",
      "SEO Pro",
    ],
  },
  "pro-agency": {
    name: "Pro Agency",
    tagline: "Stack profesional para tu agencia",
    audienceLabel: "Para agencias",
    features: [
      "Plantilla Pro Portfolio (versión agency)",
      "Members del equipo ilimitados",
      "Cartera ilimitada de jugadores",
      "5 slots de Pro Player otorgables",
      "Galería catálogo de 5 imágenes",
      "Reviews con invitación",
      "Contactos de referencia",
      "SEO Pro",
    ],
  },
};
