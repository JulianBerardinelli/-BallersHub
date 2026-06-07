# 🎥 capture/ — grabación del producto real (Playwright)

Scripts que graban la **UI real en movimiento** (lo que no se puede re-montar en
Remotion: scroll-jacking Lenis, parallax, flujos interactivos) como clips 9:16,
para después componerlos en Remotion con marca, títulos y música.

Los clips salen a `public/captures/` (**gitignored** — regenerables, pesados).
Los scripts son `.mjs` (Node ESM) y quedan fuera del typecheck de Remotion.

## Setup (una vez)

```bash
cd remotion
npm install
npx playwright install chromium   # baja el browser (~150MB, al cache global)
```

## Grabar

```bash
# Scroll de un portfolio público (default: preview del PR + slug del owner)
npm run capture:portfolio                       # julian-berardinelli
npm run capture:portfolio felipe-sarra          # otro slug

# Contra otro entorno (prod, local):
CAPTURE_BASE_URL=https://localhost:3000 npm run capture:portfolio mi-slug
```

Salida: `public/captures/portfolio-<slug>.webm` (1080×1920).

## Notas

- Viewport móvil (390×693) + `deviceScaleFactor` ≈ 2.77 → fuerza el layout móvil
  y captura nítida a 1080px de ancho.
- El scroll usa `mouse.wheel` para que **Lenis** lo interpole (smooth real del sitio).
- **Gated** (onboarding/dashboard): requiere login → se hará contra local con una
  cuenta de prueba (opción B), no contra la preview pública.
