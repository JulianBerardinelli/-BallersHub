"use client";

// BallersHub /players (Scouting Phase 2) — player card glued to a globe pin.
//
// Ported from `extras.jsx`. Reads the active pin's screen position from the
// shared `pinPositionsRef` every frame and moves itself imperatively (no React
// re-render per frame — only a single re-render when visibility flips). Latches
// the last player so the exit animation plays cleanly instead of snapping to
// empty. Shows market value in the headline slot (we don't carry a rating).

import { useEffect, useRef, useState, type MutableRefObject } from "react";

import { ClubCrest, Flag, PlayerAvatar } from "./atoms";
import { countryName } from "@/lib/scouting/taxonomies";
import type { PinPos, ScoutPlayer } from "@/lib/scouting/types";

function fmtValue(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `€${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (v >= 1_000) return `€${Math.round(v / 1000)}K`;
  return `€${v}`;
}

export function HoverCard({
  player,
  cityKey,
  stackedCount,
  cityName,
  pinPositionsRef,
}: {
  player: ScoutPlayer | null;
  cityKey: string | null;
  stackedCount: number;
  cityName: string | null;
  pinPositionsRef: MutableRefObject<Map<string, PinPos>>;
}) {
  const [latched, setLatched] = useState<ScoutPlayer | null>(player);
  useEffect(() => {
    if (player) setLatched(player);
  }, [player]);

  const outerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    const sync = () => {
      const el = outerRef.current;
      const pos = cityKey ? pinPositionsRef.current.get(cityKey) : undefined;
      if (el && pos) {
        el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        const v = !!player && pos.onFront;
        setVisible((prev) => (prev === v ? prev : v));
      } else {
        setVisible((prev) => (prev ? false : prev));
      }
      raf = requestAnimationFrame(sync);
    };
    sync();
    return () => cancelAnimationFrame(raf);
  }, [player, cityKey, pinPositionsRef]);

  const display = player ?? latched;
  if (!display) return null;

  return (
    <div
      ref={outerRef}
      className="hover-card"
      data-visible={visible ? "true" : "false"}
      aria-hidden={!visible}
    >
      <div className="hc-inner">
        {stackedCount > 1 && cityName && (
          <div className="hc-stack-pill">
            +{stackedCount - 1} en {cityName}
          </div>
        )}
        <div className="hc-row">
          <PlayerAvatar player={display} size={44} />
          <div className="hc-name-block">
            <div className="hc-name">{display.name}</div>
            <div className="hc-sub">
              {display.nationality && <Flag cc={display.nationality} withCode />}
              <span>{countryName(display.nationality)}</span>
            </div>
          </div>
          <div className="hc-rating">
            <div className="hc-rating-n" data-status={display.contract}>
              {fmtValue(display.marketValueEur)}
            </div>
            <div className="hc-rating-l">Valor</div>
          </div>
        </div>

        <div className="hc-meta">
          {display.positions.map((pos) => (
            <span
              key={pos.code}
              className="pos-tag"
              data-group={pos.group ?? undefined}
            >
              {pos.code}
            </span>
          ))}
          <span className="hc-meta-text">{display.posLabel}</span>
          {display.age != null && <span className="hc-age">{display.age}a</span>}
        </div>

        {display.club && (
          <div className="hc-club">
            <div className="hc-club-eyebrow">Club actual</div>
            <div className="hc-club-row">
              <ClubCrest club={display.club} crestUrl={display.clubCrestUrl} size={32} />
              <div className="hc-club-info">
                <div className="hc-club-name">{display.club}</div>
                <div className="hc-club-loc">
                  {display.clubCountryCode && <Flag cc={display.clubCountryCode} />}
                  {[display.city, display.clubCountry ?? countryName(display.clubCountryCode)]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="hc-arrow" />
      </div>
    </div>
  );
}
