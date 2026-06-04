"use client";

// BallersHub /players (Scouting) — hero.
//
// Globe centered, with floating overlays (title, density legend, stats) and the
// player hover card. The globe is dynamically imported with `ssr: false` so its
// heavy chunk loads only on the client; a skeleton holds the space until first
// paint. Respects `prefers-reduced-motion`.

import dynamic from "next/dynamic";
import { useState, type MutableRefObject } from "react";
import { useReducedMotion } from "framer-motion";

import { CityRoster } from "./CityRoster";
import { GlobeLegend, type TopCountry } from "./GlobeLegend";
import { HoverCard } from "./HoverCard";
import type { PinPos, ScoutCity, ScoutPlayer } from "@/lib/scouting/types";

const ScoutGlobe = dynamic(() => import("./ScoutGlobe"), { ssr: false });

export type HeroStats = {
  players: number;
  countries: number;
  cities: number;
};

export function ScoutingHero({
  cities,
  countryDensity,
  focusCity,
  hoverPin,
  onHoverPin,
  onClickPin,
  onCountryClick,
  pinPositionsRef,
  cardPlayers,
  cardCityKey,
  onCardOverflow,
  onPanelEnter,
  onPanelLeave,
  freezeRotation,
  rosterCity,
  onCloseRoster,
  topCountries,
  liveCount,
  liveCountries,
  stats,
}: {
  cities: ScoutCity[];
  countryDensity: Record<string, number>;
  focusCity: string | null;
  hoverPin: string | null;
  onHoverPin: (key: string | null) => void;
  onClickPin: (key: string) => void;
  onCountryClick: (iso2: string) => void;
  pinPositionsRef: MutableRefObject<Map<string, PinPos>>;
  /** Players of the active city — the card panel renders all of them. */
  cardPlayers: ScoutPlayer[];
  cardCityKey: string | null;
  onCardOverflow: () => void;
  onPanelEnter: () => void;
  onPanelLeave: () => void;
  /** Hold the globe still while a card panel is open. */
  freezeRotation: boolean;
  /** City whose full roster modal is open (>5 players); null when closed. */
  rosterCity: ScoutCity | null;
  onCloseRoster: () => void;
  topCountries: TopCountry[];
  liveCount: number;
  liveCountries: number;
  stats: HeroStats;
}) {
  const [ready, setReady] = useState(false);
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <div className="hero-v2">
      <div className="globe-wrap hero-globe-v2">
        {!ready && (
          <div className="skel-globe">
            <div className="skel-orb" />
            <div className="skel-label">Cargando topografía</div>
          </div>
        )}

        <ScoutGlobe
          cities={cities}
          countryDensity={countryDensity}
          focusCity={focusCity}
          hoverPin={hoverPin}
          onHoverPin={onHoverPin}
          onClickPin={onClickPin}
          onCountryClick={onCountryClick}
          pinPositionsRef={pinPositionsRef}
          onReady={() => setReady(true)}
          reduceMotion={reduceMotion}
          showZoomControls
          freezeRotation={freezeRotation}
        />

        {/* Floating title — top center */}
        <div className="float-title">
          <div className="ft-eyebrow">Scouting · Búsqueda global</div>
          <h1 className="ft-headline">El mapa del talento</h1>
          <div className="ft-sub">
            {liveCount} jugadores · {liveCountries} países en vivo
          </div>
        </div>

        {/* Floating density legend — bottom left */}
        <div className="float-density">
          <GlobeLegend topCountries={topCountries} />
        </div>

        {/* Floating stats — bottom right */}
        <div className="float-stats">
          <div className="fs-row">
            <div className="fs-num">{stats.players}</div>
            <div className="fs-lbl">Jugadores</div>
          </div>
          <div className="fs-divider" />
          <div className="fs-row">
            <div className="fs-num">{stats.countries}</div>
            <div className="fs-lbl">Países</div>
          </div>
          <div className="fs-divider" />
          <div className="fs-row">
            <div className="fs-num">{stats.cities}</div>
            <div className="fs-lbl">Ciudades</div>
          </div>
        </div>

        {/* City cards — every player at the active pin, in a row above it */}
        <HoverCard
          players={cardPlayers}
          cityKey={cardCityKey}
          pinPositionsRef={pinPositionsRef}
          onOverflow={onCardOverflow}
          onPanelEnter={onPanelEnter}
          onPanelLeave={onPanelLeave}
        />

        {/* Roster modal — only as the >5 overflow fallback */}
        <CityRoster city={rosterCity} onClose={onCloseRoster} />
      </div>
    </div>
  );
}
