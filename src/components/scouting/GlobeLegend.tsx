// BallersHub /players (Scouting) — globe density legend.
//
// Ported from `extras.jsx` `GlobeLegend`. Shows the lime→white heat ramp and
// the top countries by PLAY-country density (where players play, i.e. their
// club's country) in the current filtered set — matching the globe heat/pins.

export type TopCountry = { code: string; name: string; count: number };

export function GlobeLegend({ topCountries }: { topCountries: TopCountry[] }) {
  return (
    <div className="globe-legend">
      <div className="gl-eyebrow">Densidad de jugadores</div>
      <div className="gl-ramp">
        <div className="gl-ramp-bar" />
        <div className="gl-ramp-labels">
          <span>0</span>
          <span>medio</span>
          <span>alto</span>
        </div>
      </div>
      <div className="gl-top">
        <div className="gl-eyebrow">Países con mayor presencia</div>
        {topCountries.length === 0 ? (
          <span className="gl-empty">Sin jugadores en la selección.</span>
        ) : (
          <ol>
            {topCountries.slice(0, 5).map((t, i) => (
              <li key={t.code}>
                <span className="gl-rank">{String(i + 1).padStart(2, "0")}</span>
                <span className="gl-name">{t.name}</span>
                <span className="gl-num">{t.count}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
