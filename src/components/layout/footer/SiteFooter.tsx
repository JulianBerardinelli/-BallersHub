import { getTranslations } from "next-intl/server";

import FooterMarkup, { type FooterCTA, type FooterTheme } from "./FooterMarkup";
import {
  buildLinkColumns,
  resolveFooterCTAState,
  type FooterCTAState,
} from "./footer-state";

// Translator type — the subset of next-intl's `t` used here (plain key
// lookups). The real `t` from getTranslations is assignable to this.
type Translator = (key: string) => string;

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

// CTA buttons depend on the visitor's relationship to the product
// (anonymous / member / applicant / player / manager). Labels resolve
// from the `footer` namespace; hrefs stay locale-agnostic (FooterMarkup's
// locale-aware Link injects the prefix).
function buildCTAs(state: FooterCTAState, t: Translator): FooterCTA[] {
  switch (state.kind) {
    case "player":
      return [
        { label: t("cta.playerDashboard"), href: "/dashboard" },
        state.slug
          ? { label: t("cta.playerViewProfile"), href: `/${state.slug}`, variant: "outline" }
          : {
              label: t("cta.playerEditProfile"),
              href: "/dashboard/edit-profile/personal-data",
              variant: "outline",
            },
      ];
    case "manager":
      return [
        { label: t("cta.managerManage"), href: "/dashboard" },
        state.agencySlug
          ? {
              label: t("cta.managerViewAgency"),
              href: `/agency/${state.agencySlug}`,
              variant: "outline",
            }
          : { label: t("cta.managerSetup"), href: "/dashboard/agency", variant: "outline" },
      ];
    case "applicant":
      return [
        {
          label: state.status === "draft" ? t("cta.applicantContinue") : t("cta.applicantStatus"),
          href: "/onboarding/player/apply",
        },
        { label: t("cta.applicantDashboard"), href: "/dashboard", variant: "outline" },
      ];
    case "member":
      return [
        { label: t("cta.memberRequest"), href: "/onboarding/start" },
        { label: t("cta.memberDashboard"), href: "/dashboard", variant: "outline" },
      ];
    case "anonymous":
    default:
      return [
        { label: t("cta.anonCreate"), href: "/auth/sign-up" },
        { label: t("cta.anonAgency"), href: "/auth/sign-up?role=manager", variant: "outline" },
      ];
  }
}

// Hero copy (eyebrow + headline + subheadline) keyed by visitor state.
function buildHeadline(state: FooterCTAState, t: Translator) {
  const k = state.kind;
  return {
    eyebrow: t(`headline.${k}.eyebrow`),
    headline: { lead: t(`headline.${k}.lead`), highlight: t(`headline.${k}.highlight`) },
    subheadline: t(`headline.${k}.sub`),
  };
}

export default async function SiteFooter() {
  const t = await getTranslations("footer");
  const state = await resolveFooterCTAState();
  const ctas = buildCTAs(state, t);
  const copy = buildHeadline(state, t);
  const linkColumns = buildLinkColumns(state, t);

  // Stat values are data (not translated); only their labels are.
  const stats = [
    { value: "+1.2K", label: t("stats.profiles") },
    { value: "86", label: t("stats.clubs"), useAlt: true },
    { value: "4.8/5", label: t("stats.reviews") },
    { value: "12", label: t("stats.countries"), useAlt: true },
  ];

  const legalLinks = [
    { label: t("legal.terms"), href: "/legal/terms" },
    { label: t("legal.privacy"), href: "/legal/privacy" },
    { label: t("legal.cookies"), href: "/legal/cookies" },
  ];

  return (
    <FooterMarkup
      theme={DEFAULT_THEME}
      stats={stats}
      ctas={ctas}
      eyebrow={copy.eyebrow}
      headline={copy.headline}
      subheadline={copy.subheadline}
      linkColumns={linkColumns}
      tagline={t("tagline")}
      legalLinks={legalLinks}
      creditsLabel={t("credits")}
      showTopBorder
    />
  );
}
