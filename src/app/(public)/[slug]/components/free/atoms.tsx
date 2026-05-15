// Atoms shared across the Free portfolio layout. Server components only —
// no client-side state. Visual primitives ported from the Claude Design
// handoff (variation-safe.jsx + ui-kit.jsx).

import type { ReactNode } from "react";

// ---------------------------------------------------------------
// Flag — uses the `flag-icons` CSS package (already imported globally
// via src/styles/globals.css). The .fi class scales with font-size
// and renders the official SVG flag. Falls back to a neutral block
// for invalid codes so the layout never breaks.
// ---------------------------------------------------------------

export function Flag({
  code,
  w,
  h = 12,
  className = "",
  rounded = true,
}: {
  code: string;
  /** Optional explicit width override; flag-icons defaults to 4:3 from height. */
  w?: number;
  h?: number;
  className?: string;
  rounded?: boolean;
}) {
  const cc = (code || "").toLowerCase();
  const valid = /^[a-z]{2}$/.test(cc);
  const radius = rounded ? "rounded-[2px]" : "";

  if (!valid) {
    return (
      <span
        aria-label="no-flag"
        className={`inline-block align-middle bg-white/[0.10] ${radius} ${className}`}
        style={{ width: w ?? Math.round(h * 1.333), height: h }}
      />
    );
  }

  return (
    <span
      aria-label={cc}
      title={cc.toUpperCase()}
      className={`fi fi-${cc} inline-block align-middle ${radius} ${className}`}
      style={{
        fontSize: `${h}px`,
        width: w ?? undefined,
        height: w ? h : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  );
}

// ---------------------------------------------------------------
// Crest — renders an actual crest image when a URL is provided
// (teams.crestUrl / divisions.crestUrl) and falls back to a generated
// shield with a monogram. Default sizing is 32px square.
// ---------------------------------------------------------------

const CREST_THEMES: Record<string, { bg: string; fg: string; mono: string }> = {
  "CA Independiente": { bg: "#C8102E", fg: "#FFFFFF", mono: "I" },
  "Independiente Reserva": { bg: "#7A0A1C", fg: "#FFFFFF", mono: "IR" },
  "Selección Argentina Sub-20": { bg: "#74ACDF", fg: "#0E2E5C", mono: "AR" },
};

export function Crest({
  club,
  size = 32,
  url,
  rounded = false,
}: {
  club: string;
  size?: number;
  url?: string | null;
  rounded?: boolean;
}) {
  if (url && /^https?:\/\//i.test(url)) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className={rounded ? "rounded-full" : ""}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          flexShrink: 0,
        }}
      />
    );
  }

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
