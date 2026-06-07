// Single source of truth for how a blog cluster maps to the visual
// accent system (lime / blue / neutral) used across the redesigned blog
// surfaces — cards, featured hero, cinematic cover, prose accents and the
// generative cover art motif.
//
// The Claude Design mock keyed accents off an article-level `tone`, but the
// real schema only has `cluster`. We derive everything from cluster here so
// every surface (index, article, related, author hub) stays consistent.

import type { BlogCluster } from "@/db/schema";

export type Tone = "lime" | "blue" | "neutral";

export type Accent = {
  /** Solid accent color (text, borders, progress bar). */
  color: string;
  /** Low-alpha fill for soft backgrounds / badges. */
  soft: string;
  /** Border tint for accented surfaces. */
  border: string;
};

export type CoverMotif = "pitch" | "network" | "radar" | "grid";

export const CLUSTER_TONE: Record<BlogCluster, Tone> = {
  career_guidance: "lime", // player / movement
  agency_ops: "blue", // data / scouting
  industry_ar: "neutral", // market / industry
};

export const TONE_ACCENT: Record<Tone, Accent> = {
  lime: { color: "#CCFF00", soft: "rgba(204,255,0,0.10)", border: "rgba(204,255,0,0.22)" },
  blue: { color: "#00C2FF", soft: "rgba(0,194,255,0.10)", border: "rgba(0,194,255,0.22)" },
  neutral: { color: "#FFFFFF", soft: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.16)" },
};

// Generative cover art motif per cluster (used when a post has no hero image).
export const CLUSTER_MOTIF: Record<BlogCluster, CoverMotif> = {
  career_guidance: "pitch",
  agency_ops: "network",
  industry_ar: "radar",
};

// Large faint glyph anchored bottom-right of generative covers. Geometric,
// not emoji (brand rule: "No emoji as icons").
export const CLUSTER_GLYPH: Record<BlogCluster, string> = {
  career_guidance: "↗",
  agency_ops: "◎",
  industry_ar: "▦",
};

export function toneForCluster(cluster: BlogCluster): Tone {
  return CLUSTER_TONE[cluster];
}

export function accentForCluster(cluster: BlogCluster): Accent {
  return TONE_ACCENT[CLUSTER_TONE[cluster]];
}
