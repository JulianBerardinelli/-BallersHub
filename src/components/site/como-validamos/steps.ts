// Data model for the ¿Cómo validamos? workflow (ported from the Claude Design
// prototype). Everything in the flow derives from these arrays — node spine,
// execution light, branch fan-outs and the recap grid.

import type { ComponentType, SVGProps } from "react";

import BeSoccerIcon from "@/components/icons/BeSoccerIcon";
import ChatGptIcon from "@/components/icons/ChatGptIcon";
import ClaudeIcon from "@/components/icons/ClaudeIcon";
import FlashscoreIcon from "@/components/icons/FlashscoreIcon";
import GeminiIcon from "@/components/icons/GeminiIcon";
import TransfermarktIcon from "@/components/icons/TransfermarktIcon";

import type { StepIconName } from "./StepIcon";

export type Step = {
  id: string;
  tag: string;
  /** Per-node accent — drives border glow, icon tint, port fill, beam colour. */
  color: string;
  icon: StepIconName;
  /** Which branch (if any) fans out at this node. */
  branch?: "sources" | "agents";
};

// NOTE: per-step `title`/`sub` text lives in the `comoValidamos` i18n namespace
// (`steps[i].title` / `steps[i].sub`), read by index in both the desktop and
// mobile components. Only the layout/animation data (color, icon, tag, branch)
// stays here.
export const STEPS: Step[] = [
  { id: "solicitud", tag: "01", color: "#CCFF00", icon: "send" },
  { id: "panel", tag: "02", color: "#E9E9E9", icon: "inbox" },
  { id: "fuentes", tag: "03", color: "#00C2FF", icon: "globe", branch: "sources" },
  { id: "ia", tag: "04", color: "#00C2FF", icon: "cpu", branch: "agents" },
  { id: "decision", tag: "05", color: "#22C55E", icon: "check" },
  { id: "publicado", tag: "06", color: "#CCFF00", icon: "sun" },
];

export type Source = {
  abbr: string;
  name: string;
  /** Tile background + foreground for the styled brand chip (fallback when no logo). */
  bg: string;
  fg: string;
  /** Optional AVIF logo in /public/brands/sources/. When set, the chip renders
   *  the real mark instead of the abbr tile. */
  logo?: string;
  /** Optional inline brand SVG component (existing icons). Takes precedence over
   *  `logo` / abbr. */
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

// The +10 sources we cross-check. 365Scores removed per product decision.
// `bg`/`fg` style the placeholder chip; `logo` (AVIF) renders the real mark.
export const SOURCES: Source[] = [
  { abbr: "TM", name: "Transfermarkt", bg: "#16324f", fg: "#cfe3ff", Icon: TransfermarktIcon },
  { abbr: "BS", name: "BeSoccer", bg: "#1f8a4c", fg: "#d8ffe6", Icon: BeSoccerIcon },
  { abbr: "FS", name: "Flashscore", bg: "#b3121f", fg: "#ffd9dc", Icon: FlashscoreIcon },
  { abbr: "SS", name: "Sofascore", bg: "#2f3fd1", fg: "#dbe0ff", logo: "/brands/sources/sofascore.avif" },
  { abbr: "PM", name: "Promiedos", bg: "#0f56b3", fg: "#d6e7ff", logo: "/brands/sources/promiedos.avif" },
  { abbr: "FB", name: "FBref", bg: "#9a1230", fg: "#ffd6df", logo: "/brands/sources/fbref.avif" },
  { abbr: "SW", name: "Soccerway", bg: "#5e2a9a", fg: "#e9d9ff", logo: "/brands/sources/soccerway.avif" },
  { abbr: "WY", name: "WyScout", bg: "#0089c4", fg: "#d4f0ff" },
];

export type Agent = {
  name: string;
  conf: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const AGENTS: Agent[] = [
  { name: "Gemini", conf: "97%", Icon: GeminiIcon },
  { name: "Claude", conf: "98%", Icon: ClaudeIcon },
  { name: "ChatGPT", conf: "96%", Icon: ChatGptIcon },
];

// `title`/`desc` text lives in the `comoValidamos` namespace (`outro.recap[i]`).
export type RecapItem = { tag: string; color: string; icon: StepIconName };

export const RECAP: RecapItem[] = [
  { tag: "01", color: "#CCFF00", icon: "send" },
  { tag: "02", color: "#E9E9E9", icon: "inbox" },
  { tag: "03", color: "#00C2FF", icon: "globe" },
  { tag: "04", color: "#00C2FF", icon: "cpu" },
  { tag: "05", color: "#22C55E", icon: "check" },
  { tag: "06", color: "#CCFF00", icon: "sun" },
];

// Engine tuning. `speed` → scroll length (higher = longer/slower); `anim` →
// pointer-parallax depth (0..10). Kept as constants (the prototype's runtime
// tweaks panel is dropped for the in-app port).
export const CFG: { speed: number; anim: number } = { speed: 6, anim: 7 };
