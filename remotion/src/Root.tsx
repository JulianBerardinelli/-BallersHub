import { Composition, Folder, type CalculateMetadataFunction } from "remotion";
import {
  PortfolioReel,
  type PortfolioReelProps,
} from "./compositions/PortfolioReel/PortfolioReel";
import { ScoutGlobeFlyover } from "./compositions/ScoutGlobeFlyover/ScoutGlobeFlyover";
import { MOCK_CITIES, MOCK_DENSITY, MOCK_TOTALS } from "./compositions/ScoutGlobeFlyover/cities";
import { MOCK_REEL, getReelData } from "./lib/data";
import { BRAND } from "./lib/brand";

const FPS = 30;

/**
 * Corre ANTES del render. Trae los datos reales del jugador por `slug` y los
 * inyecta en props. Si falla (o no hay endpoint configurado todavía), cae al
 * mock de `defaultProps` así Studio nunca queda en blanco.
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
    <>
      {/* Piezas del PRODUCTO en movimiento (lo que se comparte en redes). */}
      <Folder name="Producto">
        <Composition
          id="ScoutGlobeFlyover"
          component={ScoutGlobeFlyover}
          durationInFrames={12 * FPS}
          fps={FPS}
          width={1080}
          height={1920}
          defaultProps={{
            cities: MOCK_CITIES,
            density: MOCK_DENSITY,
            totals: MOCK_TOTALS,
          }}
        />
      </Folder>

      {/* Reels de datos (tarjetas animadas — pieza secundaria). */}
      <Folder name="Reels">
        <Composition
          id="PortfolioReel"
          component={PortfolioReel}
          durationInFrames={6 * FPS}
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
      </Folder>
    </>
  );
};
