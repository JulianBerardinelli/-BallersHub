// BallersHub /players (Scouting) — shared visual atoms.
//
// Ported from the design's `flags.jsx` + `shared-bits.css`. Pure presentational
// (no hooks) so they server-render inside the crawlable table. Swapped the
// prototype's placeholders for real data: real avatar photo / club crest when
// present, deterministic gradient + initials otherwise.

import type { ContractStatus, ScoutPlayer } from "@/lib/scouting/types";

/** Stable 0–359 hue from a string seed (slug), so each avatar is consistent. */
function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) % 360;
  }
  return h;
}

/** Strip common club prefixes, then take 1–2 initials. */
function crestInitials(club: string): string {
  const cleaned = club.replace(
    /^(SL|FC|AC|AS|SSC|RB|CA|CD|B\.|Atl\.|Univ\.)\s+/i,
    "",
  );
  return cleaned
    .split(/[ '·.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? "").toUpperCase())
    .join("");
}

const FLAG_RE = /^[a-z]{2}$/i;

/** A single real SVG flag (`flag-icons`), sized via font-size. `null` if invalid. */
function FlagIcon({
  cc,
  size,
}: {
  cc: string;
  size: number;
}) {
  return (
    <span
      className={`flag-ico fi fi-${cc.toLowerCase()}`}
      style={{ fontSize: size }}
      role="img"
      aria-label={cc.toUpperCase()}
    />
  );
}

/**
 * A single country flag — a REAL SVG via `flag-icons` (globally imported in
 * globals.css), not an emoji (emoji flags don't render on Windows/Chrome).
 * `withCode` wraps it in the bordered pill with the ISO-2 label; otherwise the
 * bare flag is rendered. Renders nothing for an invalid/empty code.
 */
export function Flag({
  cc,
  withCode = false,
  size = 15,
}: {
  cc: string | null | undefined;
  withCode?: boolean;
  size?: number;
}) {
  if (!cc || !FLAG_RE.test(cc)) return null;
  if (!withCode) return <FlagIcon cc={cc} size={size} />;
  return (
    <span className="flag-pill" title={cc.toUpperCase()}>
      <FlagIcon cc={cc} size={size} />
      <span className="flag-code">{cc.toUpperCase()}</span>
    </span>
  );
}

/**
 * Stacked nationality flags — a player's nationalities piled one above the
 * other (real `flag-icons` SVGs). Shows up to `max` (default 3); any beyond
 * collapse into a "+N" chip. Renders nothing when there are no valid codes.
 */
export function FlagStack({
  codes,
  max = 3,
  size = 13,
}: {
  codes: string[] | null | undefined;
  max?: number;
  size?: number;
}) {
  const valid = (codes ?? []).filter((c) => FLAG_RE.test(c));
  if (valid.length === 0) return null;
  // Cap the pile at `max` items tall: when there are more, the last slot
  // becomes a "+N" chip so a 4th+ nationality never grows the dense 50px row.
  const overflow = valid.length > max;
  const shown = overflow ? valid.slice(0, max - 1) : valid;
  const extra = valid.length - shown.length;
  return (
    <span
      className="flag-stack"
      title={valid.map((c) => c.toUpperCase()).join(" · ")}
    >
      {shown.map((c) => (
        <FlagIcon key={c} cc={c} size={size} />
      ))}
      {extra > 0 && <span className="flag-stack-more">+{extra}</span>}
    </span>
  );
}

/** Default club crest — blue shield with initials. Real crest if `crestUrl`. */
export function ClubCrest({
  club,
  crestUrl,
  size = 28,
}: {
  club: string;
  crestUrl?: string | null;
  size?: number;
}) {
  if (crestUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="club-crest-img"
        src={crestUrl}
        alt={`Escudo de ${club}`}
        width={size}
        height={size}
        loading="lazy"
        style={{ width: size, height: size }}
      />
    );
  }
  const gradId = `crest-grad-${size}`;
  return (
    <div className="club-crest" style={{ width: size, height: size }}>
      <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,194,255,0.18)" />
            <stop offset="100%" stopColor="rgba(0,194,255,0.04)" />
          </linearGradient>
        </defs>
        <path
          d="M16 2 L4 6 V14 C4 22 9 28 16 30 C23 28 28 22 28 14 V6 Z"
          fill={`url(#${gradId})`}
          stroke="rgba(0,194,255,0.55)"
          strokeWidth="1.1"
        />
        <path
          d="M16 6 L9 9 V14 C9 19 12 23 16 24 C20 23 23 19 23 14 V9 Z"
          fill="none"
          stroke="rgba(0,194,255,0.18)"
          strokeWidth="0.8"
        />
      </svg>
      <span className="club-crest-init">{crestInitials(club)}</span>
    </div>
  );
}

/** Circular avatar. Real photo if present, else gradient + initials. Ring by contract. */
export function PlayerAvatar({
  player,
  size = 36,
  ringless = false,
}: {
  player: Pick<ScoutPlayer, "slug" | "name" | "initials" | "avatarUrl" | "contract">;
  size?: number;
  ringless?: boolean;
}) {
  const hue = hashHue(player.slug || player.name);
  return (
    <div
      className="player-avatar"
      data-status={player.contract}
      data-ringless={ringless ? "true" : "false"}
      style={{ width: size, height: size }}
    >
      {player.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="pa-photo"
          src={player.avatarUrl}
          alt={player.name}
          width={size}
          height={size}
          loading="lazy"
        />
      ) : (
        <>
          <span
            className="pa-bg"
            style={{
              background: `linear-gradient(135deg, hsl(${hue}, 18%, 26%), hsl(${(hue + 60) % 360}, 18%, 14%))`,
            }}
          />
          <span className="pa-init" style={{ fontSize: Math.max(10, size * 0.34) }}>
            {player.initials}
          </span>
        </>
      )}
    </div>
  );
}

/** Contract status pill — "Libre" (lime) / "Contrato" (blue). */
export function ContractTag({ status }: { status: ContractStatus }) {
  return (
    <span className="contract-tag" data-status={status}>
      <span className="dot" />
      {status === "free" ? "Libre" : "Contrato"}
    </span>
  );
}
