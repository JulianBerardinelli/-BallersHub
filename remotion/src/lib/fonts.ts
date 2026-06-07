/**
 * Fonts del design system de 'BallersHub, cargadas para Remotion.
 *
 * Espejo del `@theme` de la app (`src/styles/globals.css` + `src/lib/fonts.ts`):
 *   --font-bh-display → Barlow Condensed   (títulos)        → FONTS.display
 *   --font-bh-body    → DM Sans            (body / labels)  → FONTS.body
 *   --font-zuume      → Zuume (local .otf) (nombres / hero) → FONTS.name
 *
 * Las Google Fonts bloquean el render hasta estar listas (lo hace
 * @remotion/google-fonts). Zuume se carga desde public/fonts con delayRender.
 */
import { loadFont as loadBarlowCondensed } from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadLocalFont } from "@remotion/fonts";
import { continueRender, delayRender, staticFile } from "remotion";

const { fontFamily: barlowCondensed } = loadBarlowCondensed("normal", {
  weights: ["700", "800", "900"],
  subsets: ["latin"],
});

const { fontFamily: dmSans } = loadDMSans("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Zuume (local) — la display condensada itálica de los nombres del portfolio.
const ZUUME = "Zuume";
if (typeof document !== "undefined") {
  const handle = delayRender("load-zuume");
  Promise.all([
    loadLocalFont({ family: ZUUME, url: staticFile("fonts/Zuume/Zuume-Regular.otf"), weight: "400", style: "normal" }),
    loadLocalFont({ family: ZUUME, url: staticFile("fonts/Zuume/Zuume-Medium.otf"), weight: "500", style: "normal" }),
    loadLocalFont({ family: ZUUME, url: staticFile("fonts/Zuume/ZuumeCut-ExtraBoldItalic.otf"), weight: "800", style: "italic" }),
    loadLocalFont({ family: ZUUME, url: staticFile("fonts/Zuume/ZuumeCut-BlackItalic.otf"), weight: "900", style: "italic" }),
  ])
    .then(() => continueRender(handle))
    .catch(() => continueRender(handle));
}

export const FONTS = {
  /** Títulos display — Barlow Condensed (= --font-bh-display). */
  display: barlowCondensed,
  /** Body / labels — DM Sans (= --font-bh-body). */
  body: dmSans,
  /** Nombres de jugador / hero — Zuume (italic 900). Fallback a Barlow Condensed. */
  name: `"${ZUUME}", ${barlowCondensed}`,
} as const;
