"use client";

// HeroJourney — shared bits: Flag, ClubCrest, PlayerAvatar, PlayerTag, Headline,
// Eyebrow, Btn. Ported from the Claude Design prototype; font literals swapped
// for the design-system CSS variables.

import * as React from "react";

import { SCOUT_COUNTRIES, type ScoutCountry, type TagPlayer } from "./data";
import { FONT_BODY, FONT_DISPLAY } from "./useHeroScroll";

const POS_GROUP: Record<string, string> = {
  POR: "Arquero", DFC: "Defensa", LD: "Defensa", LI: "Defensa",
  MCD: "Medio", MC: "Medio", MCO: "Medio",
  EXD: "Ataque", EXI: "Ataque", DC: "Ataque",
};
const GROUP_COLOR: Record<string, string> = { Arquero: "#F59E0B", Defensa: "#FFFFFF", Medio: "#00C2FF", Ataque: "#CCFF00" };

const flagEmoji = (cc?: string | null) => {
  if (!cc || cc.length !== 2) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.charCodeAt(0) - 65) + String.fromCodePoint(A + cc.charCodeAt(1) - 65);
};

export const Flag = ({ cc, size = 16 }: { cc?: string | null; size?: number }) => {
  if (!cc) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size * 1.4, height: size, borderRadius: 3, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontSize: size * 0.78, lineHeight: 1, overflow: "hidden" }}>
      {flagEmoji(cc)}
    </span>
  );
};

export const ClubCrest = ({ club, size = 28, accent = "#00C2FF", crestUrl }: { club: string; size?: number; accent?: string; crestUrl?: string | null }) => {
  if (crestUrl) {
    return (
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0, borderRadius: 6, overflow: "hidden", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
        {/* crests come from arbitrary hosts (Wikimedia, club sites, …) → plain img, never 500s */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={crestUrl} alt={club} loading="lazy" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
    );
  }
  const initials = club
    .replace(/^(SL|FC|AC|AS|SSC|RB|B\.|Atl\.|Univ\.|CD)\s+/, "")
    .split(/[ '·]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] || "").toUpperCase())
    .join("");
  const id = "cg" + Math.abs([...club].reduce((a, c) => a + c.charCodeAt(0), 0));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 32 32" width={size} height={size}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent + "30"} />
            <stop offset="100%" stopColor={accent + "08"} />
          </linearGradient>
        </defs>
        <path d="M16 2 L4 6 V14 C4 22 9 28 16 30 C23 28 28 22 28 14 V6 Z" fill={`url(#${id})`} stroke={accent + "88"} strokeWidth="1.1" />
      </svg>
      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: size * 0.34, color: accent, paddingBottom: size * 0.06 }}>{initials}</span>
    </div>
  );
};

const PlayerAvatar = ({ player, size = 44 }: { player: TagPlayer; size?: number }) => {
  const isFree = player.contract === "free";
  const ring = isFree ? "#CCFF00" : "#00C2FF";
  const seed = [...(player.init || "?")].reduce((a, c) => a + c.charCodeAt(0), 0) || 7;
  return (
    <div style={{ position: "relative", width: size, height: size, borderRadius: "50%", flexShrink: 0, padding: 2, background: `conic-gradient(${ring}, ${ring}99, ${ring})`, boxShadow: `0 0 12px ${ring}44` }}>
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", position: "relative", border: "2px solid #0e0e0e" }}>
        {player.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.avatarUrl} alt={player.name} loading="lazy" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <>
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${135 + (seed * 17) % 90}deg, hsl(${(seed * 47) % 360},18%,28%), hsl(${(seed * 47 + 60) % 360},18%,14%))` }} />
            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: size * 0.36, color: "rgba(255,255,255,0.92)" }}>{player.init}</span>
          </>
        )}
      </div>
    </div>
  );
};

// The floating tag card that appears over the globe.
export const PlayerTag = ({
  player,
  countries,
  accent = "#00C2FF",
  compact = false,
}: {
  player: TagPlayer;
  countries?: ScoutCountry[];
  accent?: string;
  compact?: boolean;
}) => {
  const country = (countries || SCOUT_COUNTRIES).find((x) => x.code === player.nationality);
  const group = POS_GROUP[player.pos] || "Medio";
  const posColor = GROUP_COLOR[group];
  const footLabel = player.foot === "I" ? "PI" : "PD";
  const w = compact ? 244 : 300;
  return (
    <div style={{ width: w, background: "rgba(16,16,18,0.86)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: `1px solid ${accent}40`, borderRadius: 18, padding: compact ? "12px 14px" : "14px 16px", boxShadow: `0 18px 50px rgba(0,0,0,0.6), 0 0 30px ${accent}1f, inset 0 1px 0 rgba(255,255,255,0.05)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <PlayerAvatar player={player} size={compact ? 38 : 46} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: compact ? 18 : 21, color: "#fff", textTransform: "uppercase", lineHeight: 1, letterSpacing: "0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
            <Flag cc={player.nationality} size={13} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>{country?.name}</span>
          </div>
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: compact ? 20 : 24, color: accent, lineHeight: 1, letterSpacing: "-0.01em" }}>{player.marketLabel}</div>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: compact ? "10px 0" : "12px 0" }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 12, letterSpacing: "0.04em", color: posColor, background: posColor + "1a", border: `1px solid ${posColor}40`, borderRadius: 7, padding: "3px 9px" }}>{player.pos}</span>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 12, letterSpacing: "0.04em", color: "#22C55E", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 7, padding: "3px 9px" }}>{footLabel}</span>
        <span style={{ marginLeft: "auto", fontFamily: FONT_BODY, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{player.age}a</span>
      </div>

      {player.club ? (
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: compact ? 9 : 11 }}>
          <ClubCrest club={player.club} size={26} accent={accent} crestUrl={player.crestUrl} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: "rgba(255,255,255,0.78)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.club}</span>
        </div>
      ) : null}
    </div>
  );
};

export const Eyebrow = ({ children, color = "rgba(255,255,255,0.4)" }: { children: React.ReactNode; color?: string }) => (
  <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color, whiteSpace: "nowrap" }}>{children}</span>
);

export const Btn = ({
  children,
  variant = "fill",
  size = "lg",
  accent = "#CCFF00",
  onClick,
  style = {},
}: {
  children: React.ReactNode;
  variant?: "fill" | "outline";
  size?: "sm" | "lg";
  accent?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}) => {
  const [h, sH] = React.useState(false);
  const filled = variant === "fill";
  const base: React.CSSProperties = filled
    ? { background: accent, color: "#080808", border: "none", boxShadow: h ? `0 8px 30px ${accent}55` : `0 2px 14px ${accent}33`, transform: h ? "translateY(-1px)" : "none" }
    : { background: h ? "rgba(255,255,255,0.07)" : "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", transform: h ? "translateY(-1px)" : "none" };
  const sz: React.CSSProperties = size === "sm" ? { fontSize: 13, padding: "8px 16px" } : { fontSize: 15, padding: "13px 26px" };
  return (
    <button onClick={onClick} onMouseEnter={() => sH(true)} onMouseLeave={() => sH(false)} type="button"
      style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: FONT_BODY, fontWeight: 600, borderRadius: 10, cursor: "pointer", transition: "all 180ms cubic-bezier(0.25,0,0,1)", whiteSpace: "nowrap", ...base, ...sz, ...style }}>
      {children}
    </button>
  );
};

// ── Headline presets (h1 — SSR'd for SEO) ──
const HEADLINES: Record<string, { lines: string[][] }> = {
  visibilidad: { lines: [["El hub donde el"], ["#TALENTO", "futbolístico"], ["gana visibilidad real."]] },
  datos: { lines: [["Tu carrera."], ["Tu", "#data."], ["Tu futuro."]] },
  scouting: { lines: [["Donde el", "#scouting"], ["encuentra su"], ["próxima joya."]] },
  fronteras: { lines: [["El talento no"], ["tiene", "#fronteras."], ["Mostralo al mundo."]] },
};

export const Headline = ({
  which = "visibilidad",
  accent = "#CCFF00",
  size = 64,
  animate = true,
}: {
  which?: string;
  accent?: string;
  size?: number | string;
  animate?: boolean;
}) => {
  const data = HEADLINES[which] || HEADLINES.visibilidad;
  let wi = 0;
  return (
    <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: size, lineHeight: 0.94, textTransform: "uppercase", color: "#fff", margin: 0, letterSpacing: "-0.01em" }}>
      {data.lines.map((line, li) => (
        <span key={li} style={{ display: "block", overflow: "hidden", padding: "0.02em 0" }}>
          {line.map((word, i) => {
            const isAccent = word.startsWith("#");
            const text = isAccent ? word.slice(1) : word;
            const delay = wi++ * 70;
            return (
              <span key={i} className={animate ? "hj-word" : undefined} style={{ display: "inline-block", marginRight: "0.26em", color: isAccent ? accent : "#fff", animationDelay: `${delay}ms` }}>{text}</span>
            );
          })}
        </span>
      ))}
    </h1>
  );
};
