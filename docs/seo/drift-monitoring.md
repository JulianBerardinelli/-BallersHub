# SEO drift monitoring — git diff para el SEO del sitio

> **Audiencia**: maintainers de 'BallersHub.
> **Para qué**: detectar regresiones SEO accidentales después de un deploy.
> **Cuándo correr**: después de cualquier cambio que toque metadata, JSON-LD,
> robots, sitemap, llms.txt, o el render server-side de las páginas
> indexadas.

## Qué hace este sistema

Captura un **snapshot** del estado SEO de las URLs críticas de prod
(JSON-LD, meta tags, OG, canonical, sitemap, robots, llms.txt). Lo guarda
como baseline versionado en el repo. En el futuro, antes/después de un
deploy podés re-capturar y **diffear** contra el baseline para ver si
algo cambió que no debería haber cambiado.

Es "git diff para el SEO". No reemplaza a GSC (que mide tráfico real),
**complementa**: GSC te dice qué pasa en Google con días de delay; drift
monitoring te dice qué cambió en tu HTML **ahora**.

## URLs que captura

14 URLs críticas:
- `/`, `/pricing`, `/about`, `/blog`
- `/blog/authors/julian-berardinelli`
- 6 portfolios de jugadores (Pro players)
- `/sitemap.xml`, `/llms.txt`, `/robots.txt`

Si querés agregar/quitar, editá la constante `URLS` en
`scripts/seo/capture-baseline.cjs`.

## Cómo usar

### Capturar baseline nuevo (cuando llegamos a un buen estado SEO)

```bash
node scripts/seo/capture-baseline.cjs
```

Genera `docs/seo/drift/baseline-YYYY-MM-DD.json` y actualiza el pointer
`docs/seo/drift/baseline.json` al más reciente. Commiteá ambos al repo.

Cuándo:
- Después de un cambio SEO grande que querés que sea el nuevo "estado normal"
- Después de fixear una regresión y validar que todo quedó bien
- No hace falta correrlo seguido — el baseline es un punto de referencia

### Comparar el state actual contra el baseline (cuando sospechás regresión)

```bash
node scripts/seo/compare-baseline.cjs
```

Captura un snapshot fresco y lo diffea contra el baseline más reciente.
Salida clasificada por severidad:

- 🔴 **CRITICAL**: status code, canonical, robots meta, title cambiaron
  → un cambio acá puede tankear indexación o SERP. Investigar urgente.
- 🟠 **MAJOR**: description, OG tags, conteo o tipos de JSON-LD cambiaron
  → impacta rich results y previews sociales. Revisar.
- 🟡 **INFO**: contentLength cambió >10%
  → el HTML cambió de tamaño significativamente. Puede ser intencional
  (contenido nuevo) o regresión (página vacía). Revisar.

Exit codes:
- `0` — todo OK
- `1` — hay MAJORs (revisar pero no necesariamente bloquear)
- `2` — hay CRITICALs (bloquear deploy / rollback)

### Comparar contra un baseline específico

```bash
node scripts/seo/compare-baseline.cjs --baseline docs/seo/drift/baseline-2026-05-30.json
```

Útil si querés diff contra una versión histórica para entender cuándo se
introdujo un cambio.

### Apuntar a otra base URL (ej. preview)

```bash
node scripts/seo/compare-baseline.cjs --base https://preview-xxx.vercel.app
```

Útil para validar un preview antes de mergear: capturás el baseline de
prod y comparás contra el preview.

## Flujo recomendado

### Antes de un deploy grande de SEO

1. `node scripts/seo/capture-baseline.cjs --out /tmp/before.json`
2. Hacer el deploy
3. `node scripts/seo/compare-baseline.cjs --baseline /tmp/before.json`
4. Si hay CRITICALs inesperados → investigar / rollback

### Como check post-deploy

Después de mergear a `main` y que Vercel deploye:

```bash
node scripts/seo/compare-baseline.cjs
```

Si todo cambió como esperabas, **actualizá el baseline**:

```bash
node scripts/seo/capture-baseline.cjs
git add docs/seo/drift/
git commit -m "chore(seo): refresh drift baseline post-deploy <PR>"
```

### Como check periódico (mensual)

Una vez por mes, correr `compare-baseline.cjs` para detectar cambios
silenciosos (ej. una dependencia que actualizó algo de SSR, un cambio en
el layout que afectó meta tags, etc.). Si todo OK, refrescar el baseline.

## Lo que NO captura

Decisiones de scope conscientes:

- **Performance / Core Web Vitals**: GSC + PageSpeed Insights lo miden mejor.
- **Backlinks**: no son de nuestro HTML; usar GSC o Moz/Ahrefs si hace falta.
- **Tráfico / rankings**: eso es GSC (panel `/admin/seo`).
- **Contenido completo del HTML**: solo capturamos los campos que importan
  para SEO (no el cuerpo entero), para que el baseline sea legible y los
  diffs sean ruido-bajo.

## Troubleshooting

- **"URL retorna 404 nueva"**: la URL del baseline ya no existe. Si es
  intencional (ej. removimos un portfolio), actualizá el array `URLS` y
  re-capturá baseline.
- **Cambios constantes en `contentLength`**: el contenido cambia legítimamente
  (ej. /blog crece con cada post nuevo). Esto se muestra como INFO, no
  como MAJOR — no es bloqueante.
- **"jsonLd.types" cambió**: revisá si agregaste/quitaste un schema
  intencionalmente. Si sí, refrescá el baseline.
