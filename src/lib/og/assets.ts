// Brand image assets for the OG cards, inlined as data URIs.
//
// Satori's <img> resolves data URIs deterministically (no network, no CORS),
// so we read the vendored brand files off disk once and base64-encode them.
// Static `new URL(..., import.meta.url)` literals get traced into the bundle.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function dataUri(url: URL, mime: string): Promise<string> {
  const buf = await readFile(fileURLToPath(url));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

let cached: Promise<{ wordmark: string; isotipo: string }> | null = null;

export function ogAssets() {
  if (cached) return cached;
  cached = (async () => {
    const [wordmark, isotipo] = await Promise.all([
      dataUri(new URL("./assets/logo-ballershub-color.svg", import.meta.url), "image/svg+xml"),
      dataUri(new URL("./assets/isotipo-lime.png", import.meta.url), "image/png"),
    ]);
    return { wordmark, isotipo };
  })();
  return cached;
}
