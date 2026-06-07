import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND } from "../../lib/brand";
import { FONTS } from "../../lib/fonts";
import type { ReelData } from "../../lib/data";

export type PortfolioReelProps = {
  slug: string;
  /** Color de acento (default = lime de marca). Editable desde Studio / CLI. */
  accent: string;
  /** Color de fondo. */
  background: string;
  /** Datos del jugador. Los inyecta `calculateMetadata` (ver Root.tsx). */
  data: ReelData;
};

const fmtHeight = (cm: number | null) =>
  cm ? `${(cm / 100).toFixed(2).replace(".", ",")} m` : null;

/**
 * Reel vertical (9:16) del portfolio de un jugador.
 *
 * Todo se anima derivando del frame actual (spring / interpolate) — NUNCA con
 * CSS transitions/animations ni clases `animate-*` de Tailwind: no renderizan
 * de forma determinística en Remotion.
 */
export const PortfolioReel = ({
  accent,
  background,
  slug,
  data,
}: PortfolioReelProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrada con resorte, desfasada por `delay` frames (stagger).
  const enter = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const rise = (e: number, px = 40) =>
    `translateY(${interpolate(e, [0, 1], [px, 0])}px)`;
  // Conteo ascendente para las stats (0 → value).
  const countUp = (value: number, start: number, dur = 26) =>
    Math.round(
      interpolate(frame, [start, start + dur], [0, value], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    );

  const initials = data.fullName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const positionLine = [data.positions.join(" / "), data.currentClub]
    .filter(Boolean)
    .join("  ·  ");
  const metaLine = [
    data.nationality.join(" / ") || null,
    data.age != null ? `${data.age} años` : null,
    fmtHeight(data.heightCm),
  ]
    .filter(Boolean)
    .join("  ·  ");

  const heroZoom = interpolate(frame, [0, fps * 6], [1.12, 1]); // Ken Burns
  const statsEnter = enter(46);
  const stats = [
    { label: "Partidos", value: data.totals.matches, start: Math.round(fps * 1.6) },
    { label: "Goles", value: data.totals.goals, start: Math.round(fps * 1.8) },
    { label: "Asistencias", value: data.totals.assists, start: Math.round(fps * 2.0) },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: background, fontFamily: FONTS.display }}>
      {/* Glow radial de marca (lime arriba, blue abajo). */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 80% at 50% 16%, ${accent}22, transparent 60%), radial-gradient(120% 80% at 50% 102%, ${BRAND.blue}1f, transparent 55%)`,
        }}
      />

      {/* Kicker de marca. */}
      <div
        style={{
          position: "absolute",
          top: 150,
          width: "100%",
          textAlign: "center",
          opacity: enter(0),
        }}
      >
        <span
          style={{
            color: BRAND.white,
            letterSpacing: 8,
            fontSize: 30,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: accent }}>●</span>&nbsp;&nbsp;BallersHub
        </span>
      </div>

      {/* Hero / avatar. */}
      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 330 }}
      >
        <div
          style={{
            width: 360,
            height: 360,
            borderRadius: "50%",
            transform: `scale(${enter(6)})`,
            boxShadow: `0 0 120px ${accent}55, inset 0 0 0 6px ${accent}`,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${accent}, ${BRAND.blue})`,
          }}
        >
          {data.avatarUrl ? (
            <Img
              src={data.avatarUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${heroZoom})`,
              }}
            />
          ) : (
            <span style={{ fontSize: 150, fontWeight: 800, color: BRAND.black }}>
              {initials}
            </span>
          )}
        </div>
      </AbsoluteFill>

      {/* Identidad + stats, ancladas abajo. */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          paddingBottom: 210,
          paddingLeft: 90,
          paddingRight: 90,
        }}
      >
        <div style={{ opacity: enter(14), transform: rise(enter(14)) }}>
          <h1
            style={{
              margin: 0,
              color: BRAND.white,
              fontSize: 112,
              lineHeight: 0.98,
              fontWeight: 900,
              fontStyle: "italic",
              fontFamily: FONTS.name,
              textTransform: "uppercase",
            }}
          >
            {data.fullName}
          </h1>
          <p style={{ margin: "18px 0 0", color: accent, fontSize: 46, fontWeight: 700 }}>
            {positionLine}
          </p>
          {metaLine ? (
            <p style={{ margin: "10px 0 0", color: BRAND.muted, fontSize: 32 }}>
              {metaLine}
            </p>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 50,
            opacity: statsEnter,
            transform: rise(statsEnter, 30),
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                background: "#ffffff0a",
                border: `1px solid ${accent}33`,
                borderRadius: 28,
                padding: "30px 14px",
                textAlign: "center",
              }}
            >
              <div
                style={{ color: BRAND.white, fontSize: 74, fontWeight: 800, lineHeight: 1 }}
              >
                {countUp(s.value, s.start)}
              </div>
              <div
                style={{
                  color: BRAND.muted,
                  fontSize: 24,
                  marginTop: 10,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </AbsoluteFill>

      {/* Footer: URL del portfolio. */}
      <div
        style={{
          position: "absolute",
          bottom: 84,
          width: "100%",
          textAlign: "center",
          opacity: enter(72),
          color: BRAND.white,
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        ballershub.com<span style={{ color: accent }}>/{slug}</span>
      </div>
    </AbsoluteFill>
  );
};
