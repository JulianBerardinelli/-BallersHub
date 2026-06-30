// Shared design tokens for the Open Graph image system.
//
// Mirrors the brand tokens in the Claude Design handoff
// (`OG Images BallersHub.html` → `ballershub.css`). Single source of
// truth so every `opengraph-image.tsx` route renders with identical
// colors / sizing. 1200×630 is the canonical 1.91:1 social card size.

export const OG_SIZE = { width: 1200, height: 630 } as const;

export const C = {
  black: "#080808",
  surface1: "#181818",
  surface2: "#212121",
  border: "rgba(255,255,255,0.12)",
  lime: "#CCFF00",
  blue: "#00C2FF",
  fg1: "#FFFFFF",
  fg2: "rgba(255,255,255,0.70)",
  fg3: "rgba(255,255,255,0.40)",
  fg4: "rgba(255,255,255,0.20)",
} as const;

// Accent variants (the design ships lima as default + azul alt). The OG
// system uses the lima brand accent everywhere; the azul object is kept
// so a future per-surface override is a one-liner.
export type Accent = { c: string; dim: string; glow: string };
export const ACCENT = {
  lima: { c: "#CCFF00", dim: "rgba(204,255,0,0.14)", glow: "rgba(204,255,0,0.30)" },
  azul: { c: "#00C2FF", dim: "rgba(0,194,255,0.14)", glow: "rgba(0,194,255,0.30)" },
} satisfies Record<string, Accent>;

// Font family names — must match the `name` registered in `fonts.ts`.
export const FONT = {
  display: "Barlow Condensed", // hero names, stats, big numbers
  heading: "Barlow", // subtitles, club name
  body: "DM Sans", // paragraph copy
  mono: "DM Mono", // eyebrows, url, labels
} as const;
