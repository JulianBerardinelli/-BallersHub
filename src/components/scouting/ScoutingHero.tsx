"use client";

// BallersHub /players (Scouting) — hero.
//
// Globe centered, with floating overlays (title, density legend, stats) — the
// layout the user landed on in chat. The globe is dynamically imported with
// `ssr: false` so its heavy chunk loads only on the client; a skeleton holds
// the space until its first paint. Respects `prefers-reduced-motion`.

import dynamic from "next/dynamic";
import { useState } from "react";
import { useReducedMotion } from "framer-motion";

import { GlobeLegend, type TopCountry } from "./GlobeLegend";

const ScoutGlobe = dynamic(() => import("./ScoutGlobe"), { ssr: false });

export type HeroStats = { total: number; countries: number; pro: number };

export function ScoutingHero({
  countryDensity,
  onCountryClick,
  topCountries,
  liveCount,
  liveCountries,
  stats,
}: {
  countryDensity: Record<string, number>;
  onCountryClick: (iso2: string) => void;
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
          countryDensity={countryDensity}
          onCountryClick={onCountryClick}
          onReady={() => setReady(true)}
          reduceMotion={reduceMotion}
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
            <div className="fs-num">{stats.total}</div>
            <div className="fs-lbl">
              Jugadores
              <br />
              indexados
            </div>
          </div>
          <div className="fs-divider" />
          <div className="fs-row">
            <div className="fs-num">{stats.countries}</div>
            <div className="fs-lbl">
              Países
              <br />
              representados
            </div>
          </div>
          <div className="fs-divider" />
          <div className="fs-row">
            <div className="fs-num">{stats.pro}</div>
            <div className="fs-lbl">
              Perfiles
              <br />
              Pro
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
