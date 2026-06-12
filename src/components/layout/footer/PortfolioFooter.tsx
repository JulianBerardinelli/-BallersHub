import { getTranslations } from "next-intl/server";

import FooterMarkup, {
  type FooterCTA,
  type FooterTheme,
} from "./FooterMarkup";
import { buildLinkColumns, resolveFooterCTAState } from "./footer-state";

type PortfolioFooterProps = {
  /** Background of the footer (typically the portfolio's background color). */
  backgroundColor?: string | null;
  /** Primary accent (the brand color the player picked). */
  primaryColor?: string | null;
  /** Secondary accent (used for stats alt color). */
  secondaryColor?: string | null;
  /** Tertiary accent (newsletter / accent variant). */
  accentColor?: string | null;
  /** Display name of the owner (jugador o agencia) — shapes the headline copy. */
  ownerName?: string | null;
  /** Slug of the player (used for anchor); not strictly needed but kept for parity. */
  ownerSlug?: string | null;
  /** Owner type so we can adjust the copy. */
  ownerKind?: "player" | "agency";
};

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "").match(/^([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (!m) return `rgba(255,255,255,${alpha})`;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Decide whether black or white reads better on the given background. */
function pickContrastFg(hex: string): string {
  const m = hex.replace("#", "").match(/^([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (!m) return "#080808";
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? "#080808" : "#FFFFFF";
}

export default async function PortfolioFooter({
  backgroundColor,
  primaryColor,
  secondaryColor,
  accentColor,
  ownerName,
  ownerSlug,
  ownerKind = "player",
}: PortfolioFooterProps) {
  const state = await resolveFooterCTAState();
  // The public profile is multilingual (es/en/it/pt) — every string below comes
  // from the footer namespace.
  const t = await getTranslations("footer");
  const linkColumns = buildLinkColumns(state, t);

  // Decide the primary CTA according to who's reading. If the visitor already
  // has a player profile, no point pushing them to create one; same for
  // managers/agencies. Anonymous visitors get the "create profile" hook.
  const primaryCTA: FooterCTA = (() => {
    switch (state.kind) {
      case "player":
        return state.slug
          ? { label: t("cta.playerViewProfile"), href: `/${state.slug}` }
          : { label: t("cta.playerDashboard"), href: "/dashboard" };
      case "manager":
        return state.agencySlug
          ? { label: t("cta.managerViewAgency"), href: `/agency/${state.agencySlug}` }
          : { label: t("cta.managerManage"), href: "/dashboard" };
      case "applicant":
        return {
          label: state.status === "draft" ? t("cta.applicantContinue") : t("cta.applicantStatus"),
          href: "/onboarding/player/apply",
        };
      case "member":
        return { label: t("cta.memberRequest"), href: "/onboarding/start" };
      case "anonymous":
      default:
        return { label: t("cta.anonCreate"), href: "/auth/sign-up" };
    }
  })();

  const bg = backgroundColor || "#050505";
  // Primary accent — fallback through the chain so any one being missing still works.
  const accent = accentColor || primaryColor || "#CCFF00";
  const accent2 = secondaryColor || primaryColor || accent;

  const theme: FooterTheme = {
    bg,
    accent,
    accent2,
    accentFg: pickContrastFg(accent),
    fg1: "#FFFFFF",
    fg2: "rgba(255,255,255,0.65)",
    fg3: "rgba(255,255,255,0.40)",
    fg4: "rgba(255,255,255,0.20)",
    border1: "rgba(255,255,255,0.06)",
    border2: "rgba(255,255,255,0.10)",
    border3: "rgba(255,255,255,0.20)",
    surfaceSoft: "rgba(255,255,255,0.04)",
    // Force concrete font-families so the portfolio footer never inherits a
    // page-level typography override.
    displayFont: "'Barlow Condensed', system-ui, sans-serif",
    bodyFont: "'DM Sans', system-ui, sans-serif",
    monoFont: "'DM Mono', ui-monospace, monospace",
    accentGlow: hexToRgba(accent, 0.2),
    accentDim: hexToRgba(accent, 0.1),
    accentBorder: hexToRgba(accent, 0.3),
  };

  const ctas: FooterCTA[] = [
    primaryCTA,
    {
      label: t("portfolio.ctaContact"),
      href: ownerSlug ? `mailto:info@ballershub.co?subject=${encodeURIComponent(ownerSlug)}` : "/about",
      variant: "outline",
    },
  ];

  const isAgency = ownerKind === "agency";
  const headlineLead = isAgency ? t("portfolio.headlineAgency") : t("portfolio.headlinePlayer");
  const highlight = ownerName ? ownerName : "'BallersHub";
  const eyebrow = isAgency ? t("portfolio.eyebrowAgency") : t("portfolio.eyebrowPlayer");
  const subheadline = isAgency ? t("portfolio.subAgency") : t("portfolio.subPlayer");

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
    <div
      // Reset boundary: an isolated stacking + typography context so the
      // portfolio's themed CSS variables (--theme-*) don't bleed into the
      // footer markup, and so global stylings on the page don't shift it.
      style={{
        position: "relative",
        isolation: "isolate",
        background: bg,
        color: "#FFFFFF",
        fontFamily: theme.bodyFont,
      }}
    >
      <FooterMarkup
        theme={theme}
        ctas={ctas}
        eyebrow={eyebrow}
        headline={{ lead: headlineLead, highlight }}
        subheadline={subheadline}
        newsletterAccent={accent2}
        linkColumns={linkColumns}
        stats={stats}
        tagline={t("tagline")}
        creditsLabel={t("credits")}
        legalLinks={legalLinks}
      />
    </div>
  );
}
