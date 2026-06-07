import { Composition, type CalculateMetadataFunction } from "remotion";
import {
  PortfolioReel,
  type PortfolioReelProps,
} from "./compositions/PortfolioReel/PortfolioReel";
import { MOCK_REEL, getReelData } from "./lib/data";
import { BRAND } from "./lib/brand";

const FPS = 30;
const DURATION_SECONDS = 6;

/**
 * Corre ANTES del render. Trae los datos reales del jugador por `slug` y los
 * inyecta en props. Si falla (o no hay endpoint configurado todavía), cae al
 * mock de `defaultProps` así Studio nunca queda en blanco.
 * También fija el nombre de archivo de salida: `reel-<slug>.mp4`.
 */
const calcReel: CalculateMetadataFunction<PortfolioReelProps> = async ({
  props,
  abortSignal,
}) => {
  try {
    const data = await getReelData(props.slug, abortSignal);
    return { props: { ...props, data }, defaultOutName: `reel-${props.slug}` };
  } catch {
    return { props, defaultOutName: `reel-${props.slug}` };
  }
};

export const RemotionRoot = () => {
  return (
    <Composition
      id="PortfolioReel"
      component={PortfolioReel}
      durationInFrames={DURATION_SECONDS * FPS}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={
        {
          slug: MOCK_REEL.slug,
          accent: BRAND.lime,
          background: BRAND.black,
          data: MOCK_REEL,
        } satisfies PortfolioReelProps
      }
      calculateMetadata={calcReel}
    />
  );
};
