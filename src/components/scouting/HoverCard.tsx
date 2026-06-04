"use client";

// BallersHub /players (Scouting Phase 2) — city card panel glued to a globe pin.
//
// On hover (rotation is frozen by the parent so it stays put), EVERY player in
// the active city shows as a card in a row above the pin — not a single card
// with a "+N" pill. Up to 5 fit inline; beyond that the last slot becomes a
// "+N ver todos" tile that opens the roster modal. The row glides with its pin
// each frame (imperative, no per-frame React render) and is clamped to stay on
// screen, flipping below the pin when there isn't room above.

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

import { ClubCrest, Flag, PlayerAvatar } from "./atoms";
import { countryName } from "@/lib/scouting/taxonomies";
import type { PinPos, ScoutPlayer } from "@/lib/scouting/types";

/** Max cards shown inline; more than this falls back to the roster modal. */
export const MAX_INLINE = 5;

function fmtValue(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `€${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (v >= 1_000) return `€${Math.round(v / 1000)}K`;
  return `€${v}`;
}

function PinCard({ player }: { player: ScoutPlayer }) {
  return (
    <Link className="pc-card" href={`/${player.slug}`} data-status={player.contract}>
      <div className="pc-card-top">
        <PlayerAvatar player={player} size={34} />
        <div className="pc-card-id">
          <div className="pc-card-name">{player.name}</div>
          <div className="pc-card-sub">
            {player.nationality && <Flag cc={player.nationality} />}
            <span>{countryName(player.nationality)}</span>
          </div>
        </div>
        <div className="pc-card-val" data-status={player.contract}>
          {fmtValue(player.marketValueEur)}
        </div>
      </div>
      <div className="pc-card-pos">
        {player.positions.map((pos) => (
          <span key={pos.code} className="pos-tag" data-group={pos.group ?? undefined}>
            {pos.code}
          </span>
        ))}
        {player.age != null && <span className="pc-card-age">{player.age}a</span>}
      </div>
      {player.club && (
        <div className="pc-card-club">
          <ClubCrest club={player.club} crestUrl={player.clubCrestUrl} size={16} />
          <span className="pc-card-club-name">{player.club}</span>
        </div>
      )}
    </Link>
  );
}

export function HoverCard({
  players,
  cityKey,
  pinPositionsRef,
  onOverflow,
  onPanelEnter,
  onPanelLeave,
}: {
  /** Players in the active city (empty → panel hidden). */
  players: ScoutPlayer[];
  cityKey: string | null;
  pinPositionsRef: MutableRefObject<Map<string, PinPos>>;
  /** Open the full roster modal (used when there are more than MAX_INLINE). */
  onOverflow: () => void;
  onPanelEnter: () => void;
  onPanelLeave: () => void;
}) {
  // Latch the last non-empty set so the exit animation has content to show.
  const [latched, setLatched] = useState<ScoutPlayer[]>(players);
  useEffect(() => {
    if (players.length) setLatched(players);
  }, [players]);

  const outerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    const sync = () => {
      const el = outerRef.current;
      const row = rowRef.current;
      const pos = cityKey ? pinPositionsRef.current.get(cityKey) : undefined;
      if (el && row && pos && pos.onFront && players.length) {
        const wrap = el.parentElement;
        const wrapW = wrap?.clientWidth ?? 0;
        const rowW = row.offsetWidth;
        const rowH = row.offsetHeight;
        const margin = 14;
        // Clamp horizontally so the row never leaves the globe area.
        let cx = pos.x;
        if (wrapW > rowW + margin * 2) {
          cx = Math.max(rowW / 2 + margin, Math.min(wrapW - rowW / 2 - margin, pos.x));
        } else if (wrapW) {
          cx = wrapW / 2;
        }
        // Flip below the pin when there isn't room for the row above it.
        const flipDown = pos.y - 22 - rowH < margin;
        // Keep the arrow under the row even after clamping.
        const dx = Math.max(-rowW / 2 + 24, Math.min(rowW / 2 - 24, pos.x - cx));
        el.style.transform = `translate3d(${cx}px, ${pos.y}px, 0)`;
        el.style.setProperty("--arrow-dx", `${dx}px`);
        el.dataset.flip = flipDown ? "down" : "up";
        setVisible((prev) => (prev ? prev : true));
      } else {
        setVisible((prev) => (prev ? false : prev));
      }
      raf = requestAnimationFrame(sync);
    };
    sync();
    return () => cancelAnimationFrame(raf);
  }, [players, cityKey, pinPositionsRef]);

  const show = players.length ? players : latched;
  if (!show.length) return null;

  const overflow = show.length > MAX_INLINE;
  const inline = overflow ? show.slice(0, MAX_INLINE - 1) : show;
  const restCount = show.length - inline.length;

  return (
    <div
      ref={outerRef}
      className="pin-cards"
      data-visible={visible ? "true" : "false"}
      aria-hidden={!visible}
    >
      <div
        ref={rowRef}
        className="pc-row"
        onMouseEnter={onPanelEnter}
        onMouseLeave={onPanelLeave}
      >
        {inline.map((p) => (
          <PinCard key={p.id} player={p} />
        ))}
        {overflow && (
          <button type="button" className="pc-more" onClick={onOverflow}>
            <span className="pc-more-n">+{restCount}</span>
            <span className="pc-more-l">Ver todos</span>
          </button>
        )}
        <div className="pc-arrow" />
      </div>
    </div>
  );
}
