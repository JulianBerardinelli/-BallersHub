# 🎬 'BallersHub — Estudio de video (Remotion)

Sub-package **aislado** para producir reels y piezas de video para redes,
**data-driven** desde los portfolios de la plataforma. No comparte build con la
app Next: tiene su propio `package.json` y su propio dev server (Remotion
Studio). **La app Next nunca importa de acá.**

## Setup

```bash
cd remotion
npm install
```

## Trabajar (tu "After Effects")

```bash
npm run studio      # editor visual: timeline, preview, panel de props
```

Abrí la composición **PortfolioReel**. Editás `slug`, `accent`, `background`
desde el panel de props y ves el cambio en vivo.

## Render

```bash
# Con datos mock (default), salida en out/reel-<slug>.mp4
npm run render -- PortfolioReel

# Otro jugador
npm run render -- PortfolioReel --props='{"slug":"otro-jugador"}'

# Sanity check de 1 frame (rápido)
npm run still -- PortfolioReel --frame=60 --scale=0.5
```

## Datos reales

Hoy `src/lib/data.ts` devuelve un **mock** con el shape exacto de la DB, así
Studio levanta sin DB ni env vars. Para conectar datos reales, exponé en la app
Next un endpoint público `GET /api/portfolio/[slug]/reel` que devuelva un
`ReelData` y seteá la base:

```bash
REMOTION_REEL_API_BASE=https://tu-dominio npm run render -- PortfolioReel --props='{"slug":"messi"}'
```

El componente no cambia: `calculateMetadata` (en `src/Root.tsx`) hidrata los
props con `getReelData(slug)`.

## Estructura

```
remotion/
├─ src/
│  ├─ index.ts                       # registerRoot
│  ├─ Root.tsx                       # registra <Composition> + calculateMetadata
│  ├─ compositions/PortfolioReel/    # el reel 9:16
│  └─ lib/
│     ├─ brand.ts                    # tokens de marca (lime/blue/dark)
│     └─ data.ts                     # ReelData + getReelData (mock | fetch)
└─ public/                           # assets estáticos (staticFile)
```

## Reglas de Remotion (importante)

- Animá **siempre** derivando de `useCurrentFrame()` (`spring`/`interpolate`).
- ❌ Nada de CSS `transition`/`animation` ni clases `animate-*` de Tailwind:
  no renderizan de forma determinística.
- Imágenes con `<Img>` (no `next/image`); video/audio con `@remotion/media`
  (agregar la dep cuando sumemos clips).
