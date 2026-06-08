// ============================================================================
//  VideoWall — video spots config   ·  THIS IS THE FILE YOU EDIT
// ----------------------------------------------------------------------------
//  9 spots in a full-bleed 3×3 wall: 6 desktop (16:10) + 3 mobile (9:19.5).
//  Each spot is a screen-recording of the BallersHub app in action.
//
//  Grid map:   row 1 [ D1 · M1 · D2 ]
//              row 2 [ D3 · D4 · M2 ]
//              row 3 [ M3 · D5 · D6 ]
//
//  Wired with 6 encoded clips (4 desktop + 2 mobile), each in two formats —
//  AV1/WebM (Chrome/Firefox) + H.264/MP4 (Safari) — plus a JPG poster, in
//  /public/videos. There are 9 spots, so a few clips repeat (placed so no
//  duplicate sits next to its twin). To make all nine unique, drop in
//  `desktop-5/6` + `mobile-3` (see public/videos/README.md) and point the
//  reused spots below at them.
//
//  PERFORMANCE — see docs/home/video-wall.md. Clips lazy-load (Intersection
//  Observer) and pause off-screen; posters show instantly; encodes are
//  downscaled, silent and dual-format. For lighter repo/deploy weight you can
//  host the same files in Supabase Storage and swap the paths below for the
//  public URLs.
// ============================================================================

export type VideoSource = {
  /** Absolute or app-relative URL of the encoded file. */
  src: string;
  /** MIME type, e.g. `video/webm` or `video/mp4` (codecs optional). */
  type: string;
};

export type VideoSpot = {
  /** Stable label (D1, M1…). Shown on the placeholder; keep unique. */
  id: string;
  /** 'desktop' → 16:10 tile · 'mobile' → 9:19.5 tile. Fixes the aspect ratio. */
  kind: "desktop" | "mobile";
  /** Preferred: ordered list of encodings (best/smallest first). */
  sources?: VideoSource[];
  /** Convenience single-file source (used when `sources` is omitted). */
  src?: string;
  /** First-frame still shown until the clip can play. */
  poster?: string;
};

// Helper: a clip named `<n>` resolves to its webm + mp4 sources and jpg poster
// in /public/videos. Browser picks the first type it supports (AV1 → H.264).
const clip = (n: string): Pick<VideoSpot, "sources" | "poster"> => ({
  sources: [
    { src: `/videos/${n}.webm`, type: "video/webm" }, // AV1 — Chrome/Firefox/Edge
    { src: `/videos/${n}.mp4`, type: "video/mp4" }, //   H.264 — Safari/iOS + fallback
  ],
  poster: `/videos/${n}.jpg`,
});

export const VW_ROWS: VideoSpot[][] = [
  [
    // row 1 — D1 · M1 · D2
    { id: "d1", kind: "desktop", ...clip("desktop-3") }, // swapped with D3
    { id: "m1", kind: "mobile", ...clip("mobile-2") }, //  swapped with M2
    { id: "d2", kind: "desktop", ...clip("desktop-2") },
  ],
  [
    // row 2 — D3 · D4 · M2
    { id: "d3", kind: "desktop", ...clip("desktop-1") }, // swapped with D1
    { id: "d4", kind: "desktop", ...clip("desktop-4") },
    { id: "m2", kind: "mobile", ...clip("mobile-1") }, //  swapped with M1
  ],
  [
    // row 3 — M3 · D5 · D6
    { id: "m3", kind: "mobile", ...clip("mobile-1") }, //  reuse of mobile-1 (also M2)
    { id: "d5", kind: "desktop", ...clip("desktop-2") }, // reuse of desktop-2 (also D2)
    { id: "d6", kind: "desktop", ...clip("desktop-3") }, // reuse of desktop-3 (also D1)
  ],
];

export const VW_COPY = {
  eyebrow: "Red global de talento",
  line1: "Jugadores de todo el mundo,",
  line2: "en un solo ",
  accentWord: "hub",
  body: "Cada perfil está validado: identidad, trayectoria y referencias confirmadas por nuestro equipo.",
  cta: "Crear portfolio web",
};

export type VideoWallCopy = typeof VW_COPY;
