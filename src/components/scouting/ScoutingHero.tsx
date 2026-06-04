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
  cardPlayer,
  cardCityKey,
  cardCityName,
  stackedCount,
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
  cardPlayer: ScoutPlayer | null;
  cardCityKey: string | null;
  cardCityName: string | null;
  stackedCount: number;
  /** City whose full roster is open (pin click); null when closed. */
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

        {/* Player hover card — glides glued to its pin */}
        <HoverCard
          player={cardPlayer}
          cityKey={cardCityKey}
          cityName={cardCityName}
          stackedCount={stackedCount}
          pinPositionsRef={pinPositionsRef}
        />

        {/* City roster — every player at a clicked pin, side by side */}
        <CityRoster city={rosterCity} onClose={onCloseRoster} />
      </div>
    </div>
  );
}
