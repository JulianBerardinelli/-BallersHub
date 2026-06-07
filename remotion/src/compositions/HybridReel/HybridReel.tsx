import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { ScoutGlobeFlyover } from "../ScoutGlobeFlyover/ScoutGlobeFlyover";
import {
  MOCK_CITIES,
  MOCK_DENSITY,
  MOCK_TOTALS,
} from "../ScoutGlobeFlyover/cities";
import { BRAND, FONT_STACK } from "../../lib/brand";

export type HybridReelProps = {
  clip: string;
  slug: string;
  trimStartSeconds: number;
};

// --- Escena 2: el scroll real del portfolio (clip de Playwright) ---
const ScrollScene = ({
  clip,
  slug,
  trimStartSeconds,
}: {
  clip: string;
  slug: string;
  trimStartSeconds: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const kicker = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.black, fontFamily: FONT_STACK }}>
      <OffthreadVideo
        src={staticFile(clip)}
        trimBefore={Math.round(trimStartSeconds * fps)}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(5,5,5,0.55) 0%, transparent 20%, transparent 76%, rgba(5,5,5,0.9) 100%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "absolute", top: 54, width: "100%", textAlign: "center", opacity: kicker }}>
        <span style={{ color: BRAND.white, letterSpacing: 7, fontSize: 26, fontWeight: 700, textTransform: "uppercase" }}>
          <span style={{ color: BRAND.lime }}>●</span>&nbsp;&nbsp;BallersHub
        </span>
      </div>
      <div style={{ position: "absolute", bottom: 70, width: "100%", textAlign: "center", color: BRAND.white, fontSize: 30, fontWeight: 600 }}>
        ballershub.com<span style={{ color: BRAND.lime }}>/{slug}</span>
      </div>
    </AbsoluteFill>
  );
};

// --- Escena 3: outro de marca / CTA ---
const OutroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 200 } });
  const line = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const cta = spring({ frame: frame - 22, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.black,
        fontFamily: FONT_STACK,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AbsoluteFill style={{ background: `radial-gradient(60% 45% at 50% 45%, ${BRAND.lime}1f, transparent 70%)` }} />
      <div style={{ textAlign: "center", transform: `scale(${interpolate(logo, [0, 1], [0.8, 1])})`, opacity: logo }}>
        <div style={{ fontSize: 42, fontWeight: 800, color: BRAND.white, letterSpacing: 4, textTransform: "uppercase" }}>
          <span style={{ color: BRAND.lime }}>●</span> BallersHub
        </div>
      </div>
      <div style={{ marginTop: 30, opacity: line, transform: `translateY(${interpolate(line, [0, 1], [20, 0])}px)`, textAlign: "center", padding: "0 80px" }}>
        <div style={{ color: BRAND.white, fontSize: 58, fontWeight: 800, lineHeight: 1.12 }}>
          Creá tu <span style={{ color: BRAND.lime }}>portfolio</span> profesional
        </div>
      </div>
      <div style={{ marginTop: 44, opacity: cta, transform: `scale(${interpolate(cta, [0, 1], [0.9, 1])})` }}>
        <span style={{ display: "inline-block", padding: "18px 44px", borderRadius: 999, background: BRAND.lime, color: BRAND.black, fontSize: 34, fontWeight: 800 }}>
          ballershub.com
        </span>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Reel HÍBRIDO: globo /players (intro) → scroll real del portfolio → outro de
 * marca, encadenados con transiciones (@remotion/transitions). Duración total =
 * G + S + O − 2·T = 5 + 6.5 + 3 − 1 = 13.5s. Requiere el clip capturado
 * (public/captures, ver capture/).
 */
export const HybridReel = ({ clip, slug, trimStartSeconds }: HybridReelProps) => {
  const { fps } = useVideoConfig();
  const G = Math.round(5.0 * fps); // globo
  const S = Math.round(6.5 * fps); // scroll portfolio
  const O = Math.round(3.0 * fps); // outro
  const T = Math.round(0.5 * fps); // transición

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={G}>
          <ScoutGlobeFlyover cities={MOCK_CITIES} density={MOCK_DENSITY} totals={MOCK_TOTALS} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={S}>
          <ScrollScene clip={clip} slug={slug} trimStartSeconds={trimStartSeconds} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={O}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
