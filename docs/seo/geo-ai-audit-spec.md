# GEO / AI search audit — spec

> **Audiencia**: agente nuevo que va a ejecutar esta auditoría cuando
> el owner lo priorice.
> **Status**: 📋 spec — **NO ejecutar todavía**. Esperar trigger.
> **Tiempo estimado de ejecución**: 2-4 horas (auditoría + reporte).

## Qué es GEO

GEO (Generative Engine Optimization) es el equivalente de SEO para AI
search engines: Google AI Overviews, ChatGPT (browse), Perplexity, Bing
Copilot, You.com, Claude (cuando tiene web access). A diferencia de
Google clásico, estos sistemas:

- Citan **passages** específicos, no URLs completas
- Premian **autoridad temática consolidada** (no link-juice clásico)
- Leen **`llms.txt`** y robots para AI bots si está disponible
- Necesitan **answers directas** estructuradas (FAQ, listas, headings
  semánticos)
- Pesan **menciones de marca** incluso sin link (brand entity recognition)

Para 'BallersHub esto importa porque cada vez más users de la audiencia
target (agentes, jugadores, padres) buscan por AI search en lugar de
Google clásico. Si los cornerstones del blog no son citables por
passage, perdemos esa surface entera.

## Trigger — cuándo arrancar

**No arrancar antes de** que se cumpla:

1. **≥4 semanas** de data acumulada en GSC (necesitamos saber qué
   queries reales pegan)
2. **≥1 cornerstone publicado** (el draft #1 es el natural — sin esto,
   no hay nada que auditar)
3. **`/admin/seo` funcionando con data real** (no banner amarillo)

Sin esos pre-requisitos, la auditoría es teórica y sus
recomendaciones genéricas. Con ellos, podemos validar contra queries
reales que el sitio ya está atrayendo.

**Owner**: confirma al agente que los 3 triggers se cumplen antes de
arrancar.

## Output esperado

Doc en `docs/seo/geo-ai-audit-2026-MM-DD.md` con:

### Sección 1 — Crawl accessibility AI bots

- ¿Está `llms.txt` actualizado? Verificar contra
  `https://ballershub.co/llms.txt`
- ¿`robots.txt` bloquea AI bots inadvertidamente?
  - `GPTBot` (OpenAI)
  - `ClaudeBot` (Anthropic)
  - `PerplexityBot`
  - `Google-Extended` (Bard/Gemini)
  - `Bingbot` (también usa para Copilot)
  - `Applebot-Extended` (Apple Intelligence)
- Recomendación de fix si hay bloqueos.

### Sección 2 — `llms.txt` compliance

Validar contra el spec en [`llmstxt.org`](https://llmstxt.org):

- ¿Tiene H1 con nombre del proyecto?
- ¿Tiene blockquote con summary?
- ¿Listas de URLs con descripción semántica?
- ¿Está actualizado con los cornerstones publicados?
- ¿Incluye author hubs?

Recomendación de mejoras al `route.ts` que genera el `llms.txt`.

### Sección 3 — Passage-level citability

Para cada cornerstone publicado, evaluar:

- ¿Tiene headings semánticos H2/H3 que respondan preguntas concretas?
  (e.g. "¿Qué es un portfolio profesional?", "¿Cuándo armarlo?")
- ¿Tiene listas estructuradas que un AI puede citar como respuesta?
- ¿Tiene FAQ schema?
- ¿Las primeras 200 palabras dan una respuesta auto-suficiente?
- ¿Las definiciones clave están en la primera ocurrencia y no
  enterradas?

Score por cornerstone: 0-100 con criterios concretos. Recomendación
de edits específicos.

### Sección 4 — Brand mention signals

Buscar manualmente en cada AI engine:

- `"'BallersHub"`, `"BallersHub"` (con y sin apóstrofe)
- `"agente futbolista argentina plataforma"`
- `"Julián Berardinelli"`
- `"portfolio profesional futbolista digital"`

Para cada query y cada engine (Google AI Overview, ChatGPT, Perplexity,
Bing Copilot):

- ¿La marca aparece en la respuesta?
- Si aparece: ¿con link o solo mención?
- Si no aparece: ¿qué fuente cita en su lugar?

Trackear en una tabla `target × engine × query`.

### Sección 5 — Plataforma-específica

#### Google AI Overviews

- Verificar si las queries top del GSC trigger AI Overview
- Si sí: ¿quién está siendo citado? ¿Por qué no nosotros?
- Recomendaciones: structured data, FAQ schema, How-To schema

#### ChatGPT / Claude (browse)

- ¿Las páginas son crawlables por OpenAI/Anthropic? (verificar bots
  en robots.txt + `llms.txt`)
- ¿El contenido tiene answers directas en primeras 300 palabras?

#### Perplexity

- Más sensible a authority/freshness; verificar publish dates
- ¿Hay backlinks de fuentes que Perplexity considera "trusted"?

#### Bing Copilot

- Powered by Bing search index; menos exigente con AI-specific
  optimizations pero más con clean meta tags
- Verificar que Bing Webmaster Tools tenga el sitio (paralelo a GSC)

### Sección 6 — Recomendaciones priorizadas

Lista de actions ordenadas por:

- **Impacto**: alto/medio/bajo en visibility AI
- **Esfuerzo**: horas estimadas
- **Quick wins primero** (alto impacto / bajo esfuerzo)

## Cómo ejecutar

### Paso 1 — Verificar pre-requisitos

```bash
# Pre-req 1: data GSC
gh pr list --state merged --search "admin/seo" --limit 3
# Verificar que PR #131 ya está mergeado >4 semanas

# Pre-req 2: cornerstone publicado
# Query a la DB o check directo:
curl https://ballershub.co/sitemap.xml | grep "/blog/"
# Debe listar al menos 1 URL /blog/[slug] no-draft

# Pre-req 3: admin/seo funcionando
# Pedir al owner screenshot de /admin/seo — verificar que no
# muestre banner amarillo "credenciales no configuradas"
```

Si alguno falla, **detener** y reportar al owner qué falta.

### Paso 2 — Invocar skill `/claude-seo:seo-geo`

```
/claude-seo:seo-geo https://ballershub.co
```

El skill `claude-seo@agricidaniel-seo` v1.9.9 está instalado en el
repo. Subagent `claude-seo:seo-geo` ejecuta:

- AI crawler accessibility check
- `llms.txt` compliance check
- Passage-level citability scoring
- Brand mention signal analysis
- Platform-specific recommendations

Si el skill no está disponible o falla, ejecutar manualmente con los
pasos abajo.

### Paso 3 — Ejecutar manualmente (fallback)

#### Crawl accessibility

```bash
curl -s https://ballershub.co/robots.txt
curl -s https://ballershub.co/llms.txt
```

Comparar con spec en [`llmstxt.org`](https://llmstxt.org) y con
[lista de AI user-agents conocidos](https://platform.openai.com/docs/gptbot).

#### Passage citability

Para cada cornerstone publicado:

```bash
curl -s https://ballershub.co/blog/<slug> | grep -E '<h[1-3]|<li>'
```

Manualmente: ¿los H2/H3 responden preguntas? ¿hay lists con info
estructurada?

#### Brand mention (manual)

- Abrir Google.com con AI Overviews habilitado (`?udm=50`)
- Buscar cada query target
- Captura del resultado (especialmente "Sources" / "Citations" panel)
- Repetir en chat.openai.com, perplexity.ai, bing.com/chat

Esto **requiere navegación interactiva** — si el agente no tiene
acceso a browser tool, escalar al owner para que ejecute las
búsquedas y comparta screenshots.

### Paso 4 — Escribir reporte

Output en `docs/seo/geo-ai-audit-YYYY-MM-DD.md` siguiendo la
estructura de "Output esperado" arriba.

### Paso 5 — Discutir con el owner

Antes de implementar fixes, presentarle al owner:

- Las 3-5 quick wins prioritarias
- Trade-offs si hay (ej. abrir más a AI bots vs preservar bandwidth)
- Tiempo estimado de cada fix

El owner decide qué se implementa.

## Cosas que NO hacer

1. **No ejecutar antes del trigger**. Auditar un sitio sin data real
   genera recomendaciones genéricas inútiles.
2. **No bloquear AI bots por default**. La política del proyecto es
   permitir crawl AI (queremos visibility), salvo que el owner lo
   override.
3. **No implementar cambios sin aprobar el reporte con el owner**.
   Algunos fixes (e.g. agregar FAQ schema masivamente) pueden tener
   efectos colaterales en otros schemas.
4. **No comprometer la calidad editorial por keyword stuffing en
   passages**. Si el contenido tiene que sonar a robot para ser
   citable, no vale.

## Cuándo volver a auditar

Recomendado: cada **6 meses** o cuando suceda alguno de estos eventos:

- Cambio mayor en el algoritmo de Google AI Overviews
- Lanzamos un cluster temático nuevo en el blog (career_guidance →
  industry_ar → agency_ops; cada uno con su set de cornerstones)
- Hay un drop visible en el panel `/admin/seo` que no se explica por
  causas técnicas (drift) o de contenido

## Cross-references

- Estrategia general: [`docs/seo-strategy.md`](../seo-strategy.md)
- Handoff: [`docs/seo/HANDOFF.md`](./HANDOFF.md)
- Skill instalado: `claude-seo@agricidaniel-seo` v1.9.9 — comando
  `/claude-seo:seo-geo`
- Setup admin/seo (pre-requisito): [`docs/seo/admin-seo-setup.md`](./admin-seo-setup.md)
