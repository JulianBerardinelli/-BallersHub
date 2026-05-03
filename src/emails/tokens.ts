/**
 * Email design tokens — BallersHub.
 *
 * Mirrors `--bh-*` CSS variables defined in `src/styles/globals.css` but
 * resolved to email-safe HEX values (no CSS variables, no transparency
 * over the page bg, no Tailwind). Why HEX instead of rgba:
 *
 *   - Outlook (desktop) drops alpha channels in many CSS contexts.
 *   - Dark-mode email proxies (Gmail iOS, Outlook.com) re-tint backgrounds;
 *     opaque surfaces stay readable, semi-transparent ones get washed out.
 *
 * Foreground tokens are pre-composited over `bh-black` (#080808). If you
 * place a foreground color on a different surface, prefer the matching
 * surface variant (`text-on-surface-2`, etc.) rather than recomputing.
 *
 * The brand fonts (Barlow Condensed / Barlow / DM Sans / DM Mono) are
 * **not** webfont-loaded inside emails — clients have inconsistent
 * support and the wordmark is small. We declare them in the font stack
 * with sane Helvetica/Arial fallbacks so corporate clients still render
 * a clean wordmark even when the brand fonts can't load.
 */

export const senderEmail = "info@ballershub.co";
export const senderName = "BallersHub";
export const senderFrom = `${senderName} <${senderEmail}>`;
export const supportEmail = senderEmail;
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ballershub.co";

export const emailColors = {
  // Surfaces
  bg: "#080808", // bh-black
  surface1: "#181818", // bh-surface-1
  surface2: "#212121", // bh-surface-2
  surface3: "#2C2C2C", // bh-surface-3

  // Foregrounds — pre-composited over bg (#080808)
  fg1: "#FFFFFF",
  fg2: "#B5B5B5", // rgba(255,255,255,0.70) on bg
  fg3: "#6B6B6B", // rgba(255,255,255,0.40) on bg
  fg4: "#393939", // rgba(255,255,255,0.20) on bg

  // Borders — pre-composited over bg
  borderSubtle: "#171717", // rgba(255,255,255,0.06)
  borderDefault: "#262626", // rgba(255,255,255,0.12)
  borderStrong: "#3E3E3E", // rgba(255,255,255,0.22)

  // Brand — Lime (action / player)
  lime: "#CCFF00", // bh-lime-200
  limeSoft: "#EAFF82",
  limeDeep: "#AADE00",
  limeOnBgGlow: "#1A2200", // dim lime, OK as a background tint over bg

  // Brand — Blue (data / scouting)
  blue: "#00C2FF",
  blueSoft: "#7FDDFF",
  blueDeep: "#009ACC",

  // Semantic
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
} as const;

export const emailFonts = {
  display: "'Barlow Condensed', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  heading: "'Barlow', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  body: "'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono: "'DM Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
} as const;

export const emailRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
} as const;

export const emailSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const emailLayout = {
  contentWidthPx: 600, // industry default; renders well across clients
  outerPaddingPx: 24,
} as const;
