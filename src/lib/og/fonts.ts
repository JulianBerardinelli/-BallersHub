// Brand font loader for `next/og` ImageResponse (Satori).
//
// Satori needs raw font buffers — it can't read `next/font`. We vendor the
// exact TTF weights the cards use under `./fonts/` and read them off disk at
// render time. Each path is a STATIC `new URL(..., import.meta.url)` literal
// so @vercel/nft traces the .ttf files into the serverless bundle (a template
// string would not be traced). The result is memoized per function instance.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export type OgFont = {
  name: string;
  data: ArrayBuffer | Buffer;
  weight: 400 | 500 | 600 | 700 | 900;
  style: "normal";
};

async function read(url: URL): Promise<Buffer> {
  return readFile(fileURLToPath(url));
}

let cached: Promise<OgFont[]> | null = null;

export function ogFonts(): Promise<OgFont[]> {
  if (cached) return cached;
  cached = (async () => {
    const [condBlack, condSemi, barlowBold, barlowSemi, mono, sans] =
      await Promise.all([
        read(new URL("./fonts/BarlowCondensed-Black.ttf", import.meta.url)),
        read(new URL("./fonts/BarlowCondensed-SemiBold.ttf", import.meta.url)),
        read(new URL("./fonts/Barlow-Bold.ttf", import.meta.url)),
        read(new URL("./fonts/Barlow-SemiBold.ttf", import.meta.url)),
        read(new URL("./fonts/DMMono-Medium.ttf", import.meta.url)),
        read(new URL("./fonts/DMSans-Regular.ttf", import.meta.url)),
      ]);
    return [
      { name: "Barlow Condensed", data: condBlack, weight: 900, style: "normal" },
      { name: "Barlow Condensed", data: condSemi, weight: 600, style: "normal" },
      { name: "Barlow", data: barlowBold, weight: 700, style: "normal" },
      { name: "Barlow", data: barlowSemi, weight: 600, style: "normal" },
      { name: "DM Mono", data: mono, weight: 500, style: "normal" },
      { name: "DM Sans", data: sans, weight: 400, style: "normal" },
    ];
  })();
  return cached;
}
