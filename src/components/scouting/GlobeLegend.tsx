"use client";

// BallersHub /players (Scouting) — globe density legend.
//
// Ported from `extras.jsx` `GlobeLegend`. Shows the lime→white heat ramp and
// the top countries by PLAY-country density (where players play, i.e. their
// club's country) in the current filtered set — matching the globe heat/pins.

import { useTranslations } from "next-intl";

export type TopCountry = { code: string; name: string; count: number };

export function GlobeLegend({ topCountries }: { topCountries: TopCountry[] }) {
  const t = useTranslations("scouting");
  return (
    <div className="globe-legend">
      <div className="gl-eyebrow">{t("legend.densityTitle")}</div>
      <div className="gl-ramp">
        <div className="gl-ramp-bar" />
        <div className="gl-ramp-labels">
          <span>{t("legend.rampLow")}</span>
          <span>{t("legend.rampMid")}</span>
          <span>{t("legend.rampHigh")}</span>
        </div>
      </div>
      <div className="gl-top">
        <div className="gl-eyebrow">{t("legend.topCountriesTitle")}</div>
        {topCountries.length === 0 ? (
          <span className="gl-empty">{t("legend.emptySelection")}</span>
        ) : (
          <ol>
            {topCountries.slice(0, 5).map((c, i) => (
              <li key={c.code}>
                <span className="gl-rank">{String(i + 1).padStart(2, "0")}</span>
                <span className="gl-name">{c.name}</span>
                <span className="gl-num">{c.count}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
