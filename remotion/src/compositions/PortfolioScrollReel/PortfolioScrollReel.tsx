import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND } from "../../lib/brand";
import { FONTS } from "../../lib/fonts";

export type PortfolioScrollReelProps = {
  /** Ruta del clip dentro de public/ (lo genera `npm run capture:portfolio`). */
  clip: string;
  name: string;
  slug: string;
  /** Segundos de carga a recortar del inicio del clip. */
  trimStartSeconds: number;
};

/**
 * Reel que compone el SCROLL real del portfolio (clip grabado con Playwright,
 * ver capture/) a 1080×1920 con overlay de marca. El clip 540×960 se reescala a
 * cover (mismo aspect 9:16). Requiere haber corrido la captura antes (el clip
 * vive en public/captures, gitignored).
 */
export const PortfolioScrollReel = ({
  clip,
  name,
  slug,
  trimStartSeconds,
}: PortfolioScrollReelProps) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const kicker = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const footIn = interpolate(frame, [6, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Title card de entrada que se desvanece (~primeros 3s).
  const titleO = interpolate(
    frame,
    [6, 20, Math.round(fps * 2.4), Math.round(fps * 2.9)],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const outro = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.black, fontFamily: FONTS.display, opacity: outro }}>
      <OffthreadVideo
        src={staticFile(clip)}
        trimBefore={Math.round(trimStartSeconds * fps)}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* Viñeta para legibilidad de los overlays (arriba y abajo). */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(5,5,5,0.55) 0%, transparent 20%, transparent 74%, rgba(5,5,5,0.88) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Kicker de marca. */}
      <div style={{ position: "absolute", top: 54, width: "100%", textAlign: "center", opacity: kicker }}>
        <span style={{ color: BRAND.white, letterSpacing: 7, fontSize: 26, fontWeight: 700, textTransform: "uppercase" }}>
          <span style={{ color: BRAND.lime }}>●</span>&nbsp;&nbsp;BallersHub
        </span>
      </div>

      {/* Title card de entrada. */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: titleO, pointerEvents: "none" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: BRAND.muted, fontSize: 30, letterSpacing: 2, textTransform: "uppercase" }}>
            Portfolio profesional
          </div>
          <div style={{ color: BRAND.white, fontSize: 80, fontWeight: 800, marginTop: 10 }}>{name}</div>
          <div style={{ height: 6, width: 120, background: BRAND.lime, margin: "22px auto 0", borderRadius: 3 }} />
        </div>
      </AbsoluteFill>

      {/* Footer URL. */}
      <div
        style={{
          position: "absolute",
          bottom: 70,
          width: "100%",
          textAlign: "center",
          opacity: footIn,
          color: BRAND.white,
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        ballershub.com<span style={{ color: BRAND.lime }}>/{slug}</span>
      </div>
    </AbsoluteFill>
  );
};
