"use client";

// BallersHub /players (Scouting Phase 2) — city roster panel (desktop).
//
// The hover card previews a single player glued to its pin. CLICKING a pin
// opens this: every player whose club sits in that city, laid out as cards
// side by side, each a real <Link> to the profile. Solves "a pin with several
// players only ever showed one" — now you see (and can open) all of them.

import Link from "next/link";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { ClubCrest, Flag, PlayerAvatar } from "./atoms";
import { countryName } from "@/lib/scouting/taxonomies";
import type { ScoutCity, ScoutPlayer } from "@/lib/scouting/types";

function fmtValue(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `€${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (v >= 1_000) return `€${Math.round(v / 1000)}K`;
  return `€${v}`;
}

function RosterCard({ player }: { player: ScoutPlayer }) {
  const t = useTranslations("scouting");
  return (
    <Link
      className="cr-card"
      href={`/${player.slug}`}
      data-status={player.contract}
    >
      <div className="cr-card-row">
        <PlayerAvatar player={player} size={42} />
        <div className="cr-card-name-block">
          <div className="cr-card-name">
            {player.name}
            {player.isPro && <span className="pt-pro">{t("table.proBadge")}</span>}
          </div>
          <div className="cr-card-sub">
            {player.nationality && <Flag cc={player.nationality} withCode />}
            <span>{countryName(player.nationality)}</span>
          </div>
        </div>
        <div className="cr-card-rating">
          <div className="cr-card-rating-n" data-status={player.contract}>
            {fmtValue(player.marketValueEur)}
          </div>
          <div className="cr-card-rating-l">{t("roster.valueLabel")}</div>
        </div>
      </div>

      <div className="cr-card-meta">
        {player.positions.map((pos) => (
          <span
            key={pos.code}
            className="pos-tag"
            data-group={pos.group ?? undefined}
          >
            {pos.code}
          </span>
        ))}
        {player.age != null && (
          <span className="cr-card-mini">
            {t("roster.ageSuffix", { age: player.age })}
          </span>
        )}
        {player.foot && <span className="cr-card-mini">{player.foot}</span>}
        {player.heightCm && (
          <span className="cr-card-mini">
            {t("roster.heightSuffix", { height: player.heightCm })}
          </span>
        )}
      </div>

      {player.club && (
        <div className="cr-card-club">
          <ClubCrest club={player.club} crestUrl={player.clubCrestUrl} size={22} />
          <span className="cr-card-club-name">{player.club}</span>
        </div>
      )}

      <span className="cr-card-cta">
        {t("roster.viewFullProfile")}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

export function CityRoster({
  city,
  onClose,
}: {
  city: ScoutCity | null;
  onClose: () => void;
}) {
  const t = useTranslations("scouting");
  useEffect(() => {
    if (!city) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [city, onClose]);

  if (!city || city.players.length === 0) return null;

  const cityLabel = city.name || countryName(city.countryCode);

  return (
    <div className="city-roster-layer">
      <button
        type="button"
        className="cr-backdrop"
        aria-label={t("roster.close")}
        onClick={onClose}
      />
      <div
        className="city-roster"
        role="dialog"
        aria-label={t("roster.dialogLabel", { city: cityLabel })}
      >
        <div className="cr-head">
          <div className="cr-head-titles">
            <div className="cr-eyebrow">
              {city.players.length === 1
                ? t("roster.playerOne")
                : t("roster.playerCount", { count: city.players.length })}
            </div>
            <div className="cr-title">
              {city.countryCode && <Flag cc={city.countryCode} />}
              {cityLabel}
            </div>
          </div>
          <button
            type="button"
            className="cr-close"
            onClick={onClose}
            aria-label={t("roster.close")}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden>
              <path d="M1 1 L12 12 M12 1 L1 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="cr-cards">
          {city.players.map((p) => (
            <RosterCard key={p.id} player={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
