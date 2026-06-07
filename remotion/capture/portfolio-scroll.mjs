// Captura reproducible del SCROLL de un portfolio público (/[slug]) con Playwright.
//
// Graba el producto REAL en movimiento (el scroll-jacking Lenis + parallax del
// layout Pro) como un clip 9:16, para después componerlo en Remotion con marca,
// títulos y música. Los clips son regenerables → van a public/captures (gitignored).
//
// Uso:
//   node capture/portfolio-scroll.mjs [slug]
//   CAPTURE_BASE_URL=https://otro-dominio node capture/portfolio-scroll.mjs felipe-sarra
//
// Defaults: preview pública del PR + slug del owner.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE =
  process.env.CAPTURE_BASE_URL ??
  "https://ballers-cby6n0wdf-julianberardinellis-projects.vercel.app";
const SLUG = process.argv[2] ?? process.env.CAPTURE_SLUG ?? "julian-berardinelli";

const OUT_DIR = path.resolve("public/captures");
const OUT_FILE = path.join(OUT_DIR, `portfolio-${SLUG}.webm`);

// Playwright NO escala el viewport hacia arriba en recordVideo: si el `size` es
// mayor que el viewport, rellena el resto con gris. Por eso el viewport ES el
// tamaño del clip, con ancho MÓVIL (<640px → layout mobile del portfolio). El
// clip 540x960 se reescala a 1080x1920 dentro de Remotion (object-fit cover).
const W = 540; // ancho del clip (móvil, 9:16)
const H = 960; // 540x960 = 9:16
const DSF = 2; // render @2x para nitidez al reescalar

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: DSF,
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: OUT_DIR, size: { width: W, height: H } },
  });
  const page = await context.newPage();
  const url = `${BASE.replace(/\/$/, "")}/${SLUG}`;
  console.log("→ capturando", url);

  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  // Dejar asentar hero / videos / fuentes antes de arrancar el scroll.
  await page.waitForTimeout(2500);

  // Scroll suave con la rueda: Lenis lo interpola (smooth nativo del sitio).
  const maxScroll = await page.evaluate(
    () => document.body.scrollHeight - window.innerHeight,
  );
  const steps = 150;
  const dy = Math.max(1, Math.ceil(maxScroll / steps));
  await page.mouse.move(W / 2, H / 2);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy);
    await page.waitForTimeout(45); // ~150 * 45ms ≈ 6.7s de scroll
  }
  await page.waitForTimeout(1200); // beat final abajo

  const video = page.video();
  await context.close(); // finaliza y escribe el .webm
  if (!video) {
    await browser.close();
    console.error("✗ no se generó video");
    process.exit(1);
  }
  await video.saveAs(OUT_FILE); // browser todavía vivo → saveAs OK
  await browser.close();
  console.log("✓ clip:", OUT_FILE);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
