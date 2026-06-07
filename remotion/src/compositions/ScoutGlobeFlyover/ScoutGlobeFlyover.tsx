import { useCallback, useEffect, useRef } from "react";
import {
  AbsoluteFill,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND, FONT_STACK } from "../../lib/brand";
import { drawGlobe, type DrawCity } from "./drawGlobe";
import type { GlobeCity } from "./cities";

export type ScoutGlobeFlyoverProps = {
  cities: GlobeCity[];
  density: Record<string, number>;
  totals: { players: number; clubs: number; countries: number };
};

const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// Cámara dirigida por frame. `rot = [lambda, phi]`; d3 centra la vista en
// (-lambda, -phi), así que para enfocar una ciudad (lon, lat): lambda=-lon, phi=-lat.
type CamKey = { at: number; rot: [number, number]; zoom: number; label?: string };
const CAMERA: CamKey[] = [
  { at: 0, rot: [45, -12], zoom: 1.0 }, // vista Atlántico (igual que el inicio del globo real)
  { at: 3, rot: [58, 35], zoom: 1.18, label: "Buenos Aires" },
  { at: 6, rot: [4, -40], zoom: 1.22, label: "Madrid" },
  { at: 9, rot: [47, 23], zoom: 1.18, label: "São Paulo" },
  { at: 12, rot: [20, -6], zoom: 1.0 },
];

function camAt(time: number): { rot: [number, number, number]; zoom: number } {
  let a = CAMERA[0];
  let b = CAMERA[CAMERA.length - 1];
  for (let i = 0; i < CAMERA.length - 1; i++) {
    if (time >= CAMERA[i].at && time <= CAMERA[i + 1].at) {
      a = CAMERA[i];
      b = CAMERA[i + 1];
      break;
    }
  }
  const span = b.at - a.at || 1;
  const e = easeInOut(Math.max(0, Math.min(1, (time - a.at) / span)));
  return {
    rot: [
      a.rot[0] + (b.rot[0] - a.rot[0]) * e,
      a.rot[1] + (b.rot[1] - a.rot[1]) * e,
      0,
    ],
    zoom: a.zoom + (b.zoom - a.zoom) * e,
  };
}

export const ScoutGlobeFlyover = ({
  cities,
  density,
  totals,
}: ScoutGlobeFlyoverProps) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const time = frame / fps;

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { rot, zoom } = camAt(time);
    const cx = width / 2;
    const cy = height * 0.44;
    const R = Math.min(width, height) * 0.46 * zoom;
    const drawCities: DrawCity[] = cities.map((c, i) => ({
      ...c,
      appear: Math.max(0, Math.min(1, (time - 0.4 - i * 0.12) / 0.5)),
    }));
    drawGlobe(ctx, { W: width, H: height, cx, cy, R, rot, cities: drawCities, density });
  }, [time, width, height, cities, density]);

  // Dibujo determinístico por frame. delayRender/continueRender garantiza que el
  // render headless no capture el frame antes de que el canvas esté pintado.
  useEffect(() => {
    const handle = delayRender(`globe-${frame}`);
    draw();
    continueRender(handle);
  }, [draw, frame]);

  const titleIn = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const statsIn = spring({ frame: frame - Math.round(fps * 1.5), fps, config: { damping: 200 } });
  const footIn = spring({ frame: frame - Math.round(fps * 2.1), fps, config: { damping: 200 } });
  const countUp = (v: number, start: number, dur = 42) =>
    Math.round(
      interpolate(frame, [start, start + dur], [0, v], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    );

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.black, fontFamily: FONT_STACK }}>
      <AbsoluteFill
        style={{ background: `radial-gradient(60% 50% at 50% 42%, ${BRAND.lime}14, transparent 70%)` }}
      />

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* Kicker + título */}
      <div
        style={{
          position: "absolute",
          top: 116,
          width: "100%",
          textAlign: "center",
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [-20, 0])}px)`,
        }}
      >
        <div
          style={{
            color: BRAND.white,
            letterSpacing: 8,
            fontSize: 26,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: BRAND.lime }}>●</span>&nbsp;&nbsp;BallersHub
        </div>
        <div style={{ color: BRAND.white, fontSize: 64, fontWeight: 800, marginTop: 14, lineHeight: 1.05 }}>
          El mapa del <span style={{ color: BRAND.lime }}>talento</span>
        </div>
      </div>

      {/* Label de ciudad en foco (cambia con la cámara) */}
      {CAMERA.filter((k) => k.label).map((k) => {
        const dur = Math.round(2.2 * fps);
        return (
          <Sequence
            key={k.label}
            from={Math.round((k.at - 0.6) * fps)}
            durationInFrames={dur}
            layout="none"
          >
            <CityLabel name={k.label as string} dur={dur} />
          </Sequence>
        );
      })}

      {/* Contador con count-up */}
      <div
        style={{
          position: "absolute",
          bottom: 224,
          width: "100%",
          textAlign: "center",
          opacity: statsIn,
          transform: `translateY(${interpolate(statsIn, [0, 1], [24, 0])}px)`,
        }}
      >
        <div style={{ display: "inline-flex", gap: 44 }}>
          <Stat n={countUp(totals.players, Math.round(fps * 1.5))} label="Jugadores" accent />
          <Stat n={countUp(totals.clubs, Math.round(fps * 1.7))} label="Clubes" />
          <Stat n={countUp(totals.countries, Math.round(fps * 1.9))} label="Países" />
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 110,
          width: "100%",
          textAlign: "center",
          opacity: footIn,
          color: BRAND.white,
          fontSize: 30,
          fontWeight: 600,
        }}
      >
        ballershub.com<span style={{ color: BRAND.lime }}>/players</span>
      </div>
    </AbsoluteFill>
  );
};

const Stat = ({ n, label, accent }: { n: number; label: string; accent?: boolean }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1, color: accent ? BRAND.lime : BRAND.white }}>
      {n.toLocaleString("es-AR")}
    </div>
    <div style={{ fontSize: 22, color: BRAND.muted, textTransform: "uppercase", letterSpacing: 1, marginTop: 6 }}>
      {label}
    </div>
  </div>
);

const CityLabel = ({ name, dur }: { name: string; dur: number }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 8, dur - 12, dur], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ position: "absolute", bottom: 360, width: "100%", textAlign: "center", opacity: o }}>
      <span
        style={{
          display: "inline-block",
          padding: "10px 22px",
          borderRadius: 999,
          background: "#CCFF0018",
          border: "1px solid #CCFF0055",
          color: BRAND.lime,
          fontSize: 30,
          fontWeight: 700,
        }}
      >
        ◎ {name}
      </span>
    </div>
  );
};
