# Home — VideoWall (scrolljacking)

Full-bleed, scroll-driven "wall" of app screen-recordings on the home page.
Ported from a Claude Design prototype into the Next.js + TS codebase.

- **Component:** [`src/components/site/home/VideoWall/`](../../src/components/site/home/VideoWall)
  - `VideoWall.tsx` — the component (animation engine + markup)
  - `VideoWall.css` — namespaced styles (`vw-*` / `rec-*`), imported by the component
  - `videos.ts` — **the only file you edit to add clips** (the 9 spots + copy)
  - `index.ts` — barrel
- **Home wiring:** [`HomeVideoWall.tsx`](../../src/components/site/home/HomeVideoWall.tsx) — full-bleed breakout + CTA route + `prefers-reduced-motion`
- **Mounted in:** [`src/app/(site)/page.tsx`](<../../src/app/(site)/page.tsx>) right after the hero.

The effect: 9 tiles assemble from the bottom in a diagonal cascade with a 3-D
tilt, the wall pushes in and blurs (depth-of-field), and a centered headline +
**"Crear portfolio web"** CTA reveals line-by-line, then exits as you keep
scrolling. It's a single `360vh` sticky section — one scroll-progress value
(`0→1`) drives everything (`useScrollProgress → apply(p)` in `VideoWall.tsx`).

Until you add real clips, every spot shows an animated **placeholder mock** of
the app (desktop dashboard / mobile profile) with its id label (D1, M1…), so the
home already looks finished.

---

## 1. Placement plan — what goes in each of the 9 spots

The wall is a full-bleed 3×3 grid: **6 desktop (16:10) + 3 mobile (9:19.5)**.
Pick short clips that read instantly at a glance (the tiles are partly cropped
and blur during the transition, so favor clear motion / recognizable screens
over fine detail).

```
row 1 →  [ D1 · M1 · D2 ]
row 2 →  [ D3 · D4 · M2 ]
row 3 →  [ M3 · D5 · D6 ]
```

| Spot | Kind | Aspect | Suggested recording |
|------|------|--------|---------------------|
| **D1** | desktop | 16:10 | Dashboard del jugador — overview + estadísticas |
| **M1** | mobile  | 9:19.5 | Perfil público en mobile (scroll del portfolio) |
| **D2** | desktop | 16:10 | Scouting / mapa del talento (`/players`) |
| **D3** | desktop | 16:10 | Editor de portfolio (drag & drop de módulos) |
| **D4** | desktop | 16:10 | Panel de agencia / equipo |
| **M2** | mobile  | 9:19.5 | Onboarding en mobile (alta de perfil) |
| **M3** | mobile  | 9:19.5 | Galería / video del jugador en mobile |
| **D5** | desktop | 16:10 | Timeline de trayectoria |
| **D6** | desktop | 16:10 | Buscador con filtros |

> These are starting suggestions (also left as comments in `videos.ts`). Swap
> freely — the only hard rule is **keep `kind`** so the tile keeps its aspect.
> Want more/less? Edit `VW_ROWS`; the layout and animation adapt to any count
> (keep more `desktop` than `mobile` for the intended feel).

### Recording tips
- **Desktop:** record at 16:10 if you can (1920×1200). 16:9 also works —
  `object-fit: cover` crops a sliver.
- **Mobile:** record a real phone screen, vertical (e.g. 1080×2340 ≈ 9:19.5).
- Keep each clip **5–12 s** and make the **first and last frame similar** so the
  loop is seamless.
- No audio needed — it's muted; we strip it on encode (smaller files).
- Show motion in the first second (a scroll, a hover, a number ticking) — the
  tile is only fully on-screen briefly.

---

## 2. Adding the clips (one file)

Edit [`videos.ts`](../../src/components/site/home/VideoWall/videos.ts). Fill
`sources` (preferred) or `src`, plus a `poster`. Example:

```ts
{
  id: "d1",
  kind: "desktop",
  sources: [
    // smallest first — the browser picks the first type it supports
    { src: "/videos/d1.webm", type: "video/webm; codecs=av01.0.05M.08" }, // AV1
    { src: "/videos/d1.mp4",  type: "video/mp4; codecs=avc1.640028" },    // H.264
  ],
  poster: "/videos/d1.jpg",
},
```

`src` (single file) still works if you only have one format:
`{ id: "d1", kind: "desktop", src: "/videos/d1.mp4", poster: "/videos/d1.jpg" }`.

That's it — the spot switches from the mock to a real
`<video muted loop playsInline>` automatically.

---

## 3. Compression strategy (load fast, don't hurt performance)

Nine clips can be heavy, so the strategy is **don't ship more bytes/pixels than
the tile shows, and don't load them until they're needed.** Three layers:

### a) Encode small — two formats, quality-based (CRF)
UI screen-recordings (flat colors, big solid areas) compress extremely well.

- **AV1 / WebM** — smallest (~30–50% under H.264), modern browsers.
- **H.264 / MP4** — universal fallback (Safari, older devices). Always ship it.
- Encode at **~2× the tile's on-screen size**, not source resolution. The
  desktop tiles render only ~400–600 px wide; **1280×800** is plenty. Mobile
  tiles are narrow; **540×1170** (9:19.5) is plenty.
- Strip audio (`-an`), cap at 30 fps, and use `+faststart` on MP4 so playback
  can begin before the file finishes downloading.

```bash
# ---- DESKTOP spot (16:10 → 1280×800) -------------------------------------
SRC=raw/d1.mov; OUT=public/videos/d1
VF="scale=1280:800:force_original_aspect_ratio=increase,crop=1280:800,fps=30"

# AV1 / WebM (smallest)
ffmpeg -i "$SRC" -an -vf "$VF" \
  -c:v libsvtav1 -crf 38 -preset 7 -g 240 -pix_fmt yuv420p "$OUT.webm"

# H.264 / MP4 (fallback) — yuv420p + faststart are required for Safari/iOS
ffmpeg -i "$SRC" -an -vf "$VF" \
  -c:v libx264 -crf 30 -preset slow -profile:v high -pix_fmt yuv420p \
  -movflags +faststart "$OUT.mp4"

# Poster (first frame → small JPG; optionally convert to AVIF/WebP with sharp)
ffmpeg -i "$OUT.mp4" -frames:v 1 -q:v 4 "$OUT.jpg"
```

For **mobile** spots, change `VF` to
`scale=540:1170:force_original_aspect_ratio=increase,crop=540:1170,fps=30`.

Tuning the size/quality trade-off:
- Smaller files → raise CRF (`av1 38→42`, `x264 30→34`).
- Crisper → lower CRF. Re-check on a real screen; UI text is the first thing to
  smear if you push too hard.

**Target:** ≤ ~300–500 KB per clip (≈ ≤ 3–4 MB for all nine). A `poster` should
be ~20–40 KB.

Batch all nine with a small loop — see
[`public/videos/README.md`](../../public/videos/README.md).

### b) Don't block the page — lazy by design (already built in)
- Tiles **don't download or play until the wall nears the viewport**
  (IntersectionObserver in `VideoWall.tsx`); they **pause when it leaves** to
  save CPU/battery. So the hero/LCP is never taxed by the clips.
- Each `<video>` is `preload="none"` until armed, then `preload="auto"`; the
  **poster shows instantly** so a tile is never blank.
- `prefers-reduced-motion` users get a static layout and the videos stay on
  their poster (no autoplay).

### c) Serve from the right place with long cache headers
- **Best: a storage bucket / CDN** — e.g. **Supabase Storage** (already in the
  stack) in a public `home-videos` bucket, or Vercel Blob. Point `sources` at
  the public URLs and set `Cache-Control: public, max-age=31536000, immutable`
  (version the filename when you re-encode). This keeps the clips out of the git
  repo and the deploy bundle, and serves them from the edge.
- **OK to start: `public/videos/`** — fine for a handful of small files. They're
  served from the origin as static assets (videos aren't touched by the
  `next/image` optimizer either way). Drop files there matching the ids
  (`d1.webm`, `d1.mp4`, `d1.jpg`, …) and reference `/videos/<id>.<ext>`.
  Downside: they ship with the repo/deploy, so move to a bucket once they grow.

---

## 4. Tuning the animation

All timing lives in `apply(p)` in `VideoWall.tsx` (a single progress value 0→1):

| `p` range | What happens |
|-----------|--------------|
| `0 → 0.5`   | tiles cascade in (bottom rows lead) + wall lifts |
| `0.5 → 0.74`| wall pushes in & blurs (DOF); dark veil rises |
| `0.54 → 0.74`| headline + CTA reveal line-by-line |
| `0.88 → 1`  | text exits, wall recedes |

- **Slower/faster overall:** change `sectionVh` (default `360`). Higher = more
  scroll = slower.
- **Where it sits / replaces sections:** it's just an entry in
  `src/app/(site)/page.tsx`. Move it, or remove other home sections, freely.
- **Accent color:** `accent` prop (defaults to the lime `#CCFF00` =
  `--bh-lime-200`).

---

## 5. Why it's wired the way it is (integration notes)

- **Sticky works** because nothing between the section and the page scroller uses
  `transform`/`overflow` that would break `position: sticky`. (Lenis smooth-scroll
  is scoped to `(public)/[slug]` only — the home uses native scroll.) The
  full-bleed breakout uses a **negative margin, not a transform**, to preserve
  sticky.
- **Full-bleed** inside the 1200 px `<main>` via `w-screen` +
  `ml-[calc(50%-50vw)]`; `overflow-x` is already clipped on `body`/site layout,
  so no horizontal scrollbar.
- **Fonts** use the design-system variables (Barlow Condensed / DM Sans / DM
  Mono, already loaded via `next/font`), chained through the raw next/font vars
  as a guaranteed fallback.
- **Styles** are a co-located CSS import (SSR'd as a real stylesheet chunk), not
  runtime `<head>` injection — same pattern as `scouting/scouting.css`.
