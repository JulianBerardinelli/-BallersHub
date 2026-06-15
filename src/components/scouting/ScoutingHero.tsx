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
import { useTranslations } from "next-intl";

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
  selectedCountries,
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
  /** ISO-2 codes in the play-country filter — pulsed on the globe. */
  selectedCountries: string[];
  /** City whose full roster modal is open (>5 players); null when closed. */
  rosterCity: ScoutCity | null;
  onCloseRoster: () => void;
  topCountries: TopCountry[];
  liveCount: number;
  liveCountries: number;
  stats: HeroStats;
}) {
  const t = useTranslations("scouting");
  const [ready, setReady] = useState(false);
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <div className="hero-v2">
      <div className="globe-wrap hero-globe-v2">
        {!ready && (
          <div className="skel-globe">
            <div className="skel-orb" />
            <div className="skel-label">{t("hero.loadingGlobe")}</div>
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
          selectedCountries={selectedCountries}
        />

        {/* Floating title — top center */}
        <div className="float-title">
          <div className="ft-eyebrow">{t("hero.eyebrow")}</div>
          <h1 className="ft-headline">{t("hero.headline")}</h1>
          <div className="ft-sub">
            {t("hero.subtitle", { count: liveCount, countries: liveCountries })}
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
            <div className="fs-lbl">{t("stats.players")}</div>
          </div>
          <div className="fs-divider" />
          <div className="fs-row">
            <div className="fs-num">{stats.countries}</div>
            <div className="fs-lbl">{t("stats.countries")}</div>
          </div>
          <div className="fs-divider" />
          <div className="fs-row">
            <div className="fs-num">{stats.cities}</div>
            <div className="fs-lbl">{t("stats.cities")}</div>
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
