import FooterMarkup, { type FooterCTA, type FooterTheme } from "./FooterMarkup";
import {
  buildLinkColumns,
  resolveFooterCTAState,
  type FooterCTAState,
} from "./footer-state";

const DEFAULT_THEME: FooterTheme = {
  bg: "#080808",
  accent: "#CCFF00",
  accent2: "#00C2FF",
  accentFg: "#080808",
  fg1: "#FFFFFF",
  fg2: "rgba(255,255,255,0.65)",
  fg3: "rgba(255,255,255,0.40)",
  fg4: "rgba(255,255,255,0.20)",
  border1: "rgba(255,255,255,0.06)",
  border2: "rgba(255,255,255,0.10)",
  border3: "rgba(255,255,255,0.20)",
  surfaceSoft: "rgba(255,255,255,0.04)",
  displayFont: "var(--font-barlow-condensed), 'Barlow Condensed', sans-serif",
  bodyFont: "var(--font-dm-sans), 'DM Sans', sans-serif",
  monoFont: "var(--font-dm-mono), 'DM Mono', monospace",
  accentGlow: "rgba(204,255,0,0.20)",
  accentDim: "rgba(204,255,0,0.10)",
  accentBorder: "rgba(204,255,0,0.30)",
};

function buildCTAs(state: FooterCTAState): FooterCTA[] {
  switch (state.kind) {
    case "player":
      return [
        { label: "Ir a mi panel", href: "/dashboard" },
        state.slug
          ? { label: "Ver mi perfil público", href: `/${state.slug}`, variant: "outline" }
          : {
              label: "Editar mi perfil",
              href: "/dashboard/edit-profile/personal-data",
              variant: "outline",
            },
      ];
    case "manager":
      return [
        { label: "Gestionar agencia", href: "/dashboard" },
        state.agencySlug
          ? {
              label: "Ver perfil de agencia",
              href: `/agency/${state.agencySlug}`,
              variant: "outline",
            }
          : { label: "Configurar agencia", href: "/dashboard/agency", variant: "outline" },
      ];
    case "applicant":
      return [
        {
          label: state.status === "draft" ? "Continuar mi solicitud" : "Ver estado de solicitud",
          href: "/onboarding/player/apply",
        },
        { label: "Ir al panel", href: "/dashboard", variant: "outline" },
      ];
    case "member":
      return [
        { label: "Solicitar cuenta de profesional", href: "/onboarding/start" },
        { label: "Ir al panel", href: "/dashboard", variant: "outline" },
      ];
    case "anonymous":
    default:
      return [
        { label: "Crear mi perfil", href: "/auth/sign-up" },
        { label: "Soy una agencia", href: "/auth/sign-up?role=manager", variant: "outline" },
      ];
  }
}

function buildHeadline(state: FooterCTAState): {
  eyebrow: string;
  headline: { lead: string; highlight: string };
  subheadline: string;
} {
  switch (state.kind) {
    case "player":
      return {
        eyebrow: "Tu carrera, en movimiento",
        headline: { lead: "Mantené tu perfil ", highlight: "siempre actualizado." },
        subheadline:
          "Subí nuevas fotos, ajustá tus datos futbolísticos y dejá que los clubes te encuentren con la información correcta.",
      };
    case "manager":
      return {
        eyebrow: "Tu agencia, sin fricciones",
        headline: { lead: "Gestioná tu cartera ", highlight: "con precisión." },
        subheadline:
          "Sumá jugadores, validá perfiles y compartí el roster oficial de tu agencia con clubes en todo el mundo.",
      };
    case "applicant":
      return {
        eyebrow: "Tu solicitud está en marcha",
        headline: { lead: "Estás a un paso ", highlight: "de tu cuenta profesional." },
        subheadline:
          "Mientras revisamos tus datos, podés seguir explorando perfiles validados, casos de éxito y novedades del producto.",
      };
    case "member":
      return {
        eyebrow: "Listo cuando vos quieras",
        headline: { lead: "Convertí tu cuenta en ", highlight: "un perfil profesional." },
        subheadline:
          "Solicitá tu cuenta de jugador o agencia y empezá a operar dentro del ecosistema con verificación oficial.",
      };
    case "anonymous":
    default:
      return {
        eyebrow: "En vivo · 86 clubes activos",
        headline: { lead: "Subí, validá y ", highlight: "jugá donde importa." },
        subheadline:
          "Más de 1.200 perfiles validados. Reseñas de cuerpo técnico verificadas. Tu próximo club te está buscando.",
      };
  }
}

export default async function SiteFooter() {
  const state = await resolveFooterCTAState();
  const ctas = buildCTAs(state);
  const copy = buildHeadline(state);
  const linkColumns = buildLinkColumns(state);

  return (
    <FooterMarkup
      theme={DEFAULT_THEME}
      ctas={ctas}
      eyebrow={copy.eyebrow}
      headline={copy.headline}
      subheadline={copy.subheadline}
      linkColumns={linkColumns}
      showTopBorder
    />
  );
}
