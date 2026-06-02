// BallersHub /players (Scouting) — shared visual atoms.
//
// Ported from the design's `flags.jsx` + `shared-bits.css`. Pure presentational
// (no hooks) so they server-render inside the crawlable table. Swapped the
// prototype's placeholders for real data: real avatar photo / club crest when
// present, deterministic gradient + initials otherwise.

import { flagEmoji } from "@/lib/scouting/taxonomies";
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

/** Flag pill — emoji + optional ISO-2 code. Renders nothing without a code. */
export function Flag({
  cc,
  withCode = false,
}: {
  cc: string | null | undefined;
  withCode?: boolean;
}) {
  const glyph = flagEmoji(cc);
  if (!glyph) return null;
  return (
    <span className="flag-pill" title={cc ?? undefined}>
      <span className="flag-glyph">{glyph}</span>
      {withCode && cc && <span className="flag-code">{cc.toUpperCase()}</span>}
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
