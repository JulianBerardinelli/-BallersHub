// Atoms shared across the Free portfolio layout. Server components only —
// no client-side state. Visual primitives ported from the Claude Design
// handoff (variation-safe.jsx + ui-kit.jsx).

import type { ReactNode } from "react";

// ---------------------------------------------------------------
// Flag — minimal SVG flags for the most common nationalities.
// Falls back to a grey square for unknown codes so the layout
// doesn't break on countries we haven't drawn yet.
// ---------------------------------------------------------------

type FlagDef = { stripes: string[]; dir: "row" | "col" };

const FLAGS: Record<string, FlagDef> = {
  ar: { stripes: ["#74ACDF", "#FFFFFF", "#74ACDF"], dir: "row" },
  it: { stripes: ["#008C45", "#F4F5F0", "#CD212A"], dir: "col" },
  es: { stripes: ["#AA151B", "#F1BF00", "#F1BF00", "#AA151B"], dir: "row" },
  br: { stripes: ["#009C3B"], dir: "row" },
  uy: { stripes: ["#FFFFFF", "#0038A8"], dir: "row" },
  cl: { stripes: ["#FFFFFF", "#D52B1E"], dir: "row" },
  co: { stripes: ["#FCD116", "#003893", "#CE1126"], dir: "row" },
  pe: { stripes: ["#D91023", "#FFFFFF", "#D91023"], dir: "col" },
  mx: { stripes: ["#006847", "#FFFFFF", "#CE1126"], dir: "col" },
  fr: { stripes: ["#0055A4", "#FFFFFF", "#EF4135"], dir: "col" },
  pt: { stripes: ["#006600", "#FF0000"], dir: "col" },
  de: { stripes: ["#000000", "#DD0000", "#FFCE00"], dir: "row" },
  gb: { stripes: ["#012169"], dir: "row" }, // simplified
  us: { stripes: ["#B22234", "#FFFFFF"], dir: "row" }, // simplified
};

export function Flag({
  code,
  w = 16,
  h = 12,
  className,
}: {
  code: string;
  w?: number;
  h?: number;
  className?: string;
}) {
  const c = (code || "").toLowerCase();
  const f = FLAGS[c] || { stripes: ["#444"], dir: "row" as const };
  const isCol = f.dir === "col";
  return (
    <span
      aria-label={c}
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: isCol ? "row" : "column",
        width: w,
        height: h,
        borderRadius: 2,
        overflow: "hidden",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
        verticalAlign: "middle",
        flexShrink: 0,
      }}
    >
      {f.stripes.map((color, i) => (
        <span
          key={i}
          style={{ flex: 1, background: color, display: "block" }}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------
// Crest — generated club shield with monogram fallback.
// Real club crests can replace this later by overriding by club name.
// ---------------------------------------------------------------

const CREST_THEMES: Record<string, { bg: string; fg: string; mono: string }> = {
  "CA Independiente": { bg: "#C8102E", fg: "#FFFFFF", mono: "I" },
  "Independiente Reserva": { bg: "#7A0A1C", fg: "#FFFFFF", mono: "IR" },
  "Selección Argentina Sub-20": { bg: "#74ACDF", fg: "#0E2E5C", mono: "AR" },
};

export function Crest({ club, size = 32 }: { club: string; size?: number }) {
  const theme =
    CREST_THEMES[club] ?? {
      bg: "#2C2C2C",
      fg: "#FFFFFF",
      mono: (club || "?").trim().slice(0, 1).toUpperCase() || "?",
    };
  return (
    <svg
      width={size}
      height={size * 1.1}
      viewBox="0 0 40 44"
      style={{ flexShrink: 0 }}
      aria-hidden
    >
      <path
        d="M4 4 L36 4 L36 24 Q36 38 20 42 Q4 38 4 24 Z"
        fill={theme.bg}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
      />
      <text
        x="20"
        y="26"
        textAnchor="middle"
        fontFamily="Barlow Condensed, sans-serif"
        fontWeight="900"
        fontSize={theme.mono.length > 1 ? 13 : 18}
        fill={theme.fg}
        letterSpacing="0.04em"
      >
        {theme.mono}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------
// Eyebrow — small uppercase label, used to introduce sections.
// ---------------------------------------------------------------

export function Eyebrow({
  children,
  tone = "muted",
  className = "",
}: {
  children: ReactNode;
  tone?: "muted" | "accent";
  className?: string;
}) {
  const color = tone === "accent" ? "text-bh-lime" : "text-bh-fg-3";
  return (
    <span
      className={`font-bh-mono text-[10px] font-semibold uppercase tracking-[0.16em] ${color} ${className}`}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------
// VitalCell — used in the hero stats strip (Edad, Físico, Pie hábil,
// Club actual). Accepts either a primitive value (with optional unit)
// or a fully-rendered React node via valueRaw.
// ---------------------------------------------------------------

export function VitalCell({
  label,
  value,
  valueRaw,
  unit,
  sub,
  accentLabel = false,
}: {
  label: string;
  value?: string | number;
  valueRaw?: ReactNode;
  unit?: string;
  sub?: string;
  accentLabel?: boolean;
}) {
  return (
    <div className="flex min-h-[80px] flex-col justify-between gap-2 bg-bh-surface-1 p-4 md:min-h-[96px] md:p-5">
      <div
        className={`font-body text-[10px] font-semibold uppercase tracking-[0.14em] ${accentLabel ? "text-bh-lime" : "text-bh-fg-3"}`}
      >
        {label}
      </div>
      <div className="font-bh-display text-2xl font-black uppercase leading-none tabular-nums text-bh-fg-1 md:text-[32px]">
        {valueRaw != null ? (
          valueRaw
        ) : (
          <>
            {value ?? "—"}
            {unit ? (
              <span className="ml-1 text-[0.55em] font-semibold text-bh-fg-3">
                {unit}
              </span>
            ) : null}
          </>
        )}
      </div>
      {sub ? (
        <div className="font-bh-mono text-[10px] uppercase tracking-[0.04em] text-bh-fg-3">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------
// DataRow — key/value row inside the identity card.
// ---------------------------------------------------------------

export function DataRow({
  label,
  children,
  multiline = false,
  last = false,
}: {
  label: string;
  children: ReactNode;
  multiline?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[100px_1fr] gap-2.5 px-3.5 py-3 ${last ? "" : "border-b border-white/[0.06]"} ${multiline ? "items-start" : "items-center"}`}
    >
      <div className="font-body text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
        {label}
      </div>
      <div className="font-body text-[13px] leading-[1.5] text-bh-fg-1">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Lock + share icons (inline SVG, no deps).
// ---------------------------------------------------------------

export function LockIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function ShareIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
      <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
    </svg>
  );
}

export function ExtIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
