# 'BallersHub — Pricing Matrix

> **Status**: 🟡 In progress (draft v1)
> **Owner**: @julian-berardinelli
> **Audience**: documento de referencia para producto, diseño y desarrollo. Es la fuente única de verdad de qué incluye cada plan y cómo se gatean las features.
>
> Cuando algo de esta matriz cambie, **actualizar primero acá** y luego propagar a:
> - `src/components/site/pricing/PricingPlans.tsx` (cards principales)
> - `src/components/site/pricing/PricingComparisonTable.tsx` (matriz pública)
> - `src/components/site/pricing/PricingDetailPanel.tsx` (panel scroll-jack)
> - El módulo de billing/Stripe cuando se conecte
> - Los gates en el dashboard (modales upgrade, blur, etc)

---

## 1. Audiencias y planes

| Audiencia | Plan Free | Plan Pro |
|---|---|---|
| **Player** (jugador / jugadora) | `free-player` | `pro-player` |
| **Agency** (agencia / representación) | `free-agency` | `pro-agency` |

- 2 planes × 2 audiencias = 4 variantes.
- En la pricing page hay un **toggle** `Soy jugador / Soy agencia` que swappea las cards (mismo grid, distinto contenido).
- En el onboarding, el rol del usuario (player vs agency) determina qué set de planes se le muestra. No mezcla.

## 2. Modelo de precios y trial

### Cadencia única: anual

**No hay opción mensual.** Todo cobro es **anual**, single-shot, sin opción de elegir cadencia. La razón: el producto tiene picos estacionales (mercado de pases, ~2 ventanas/año). Si existiera opción mensual, una porción significativa de usuarios pagaría 1–2 meses (los del mercado), aprovecharía y cancelaría — bajando drásticamente la retención. Cobrar anual fuerza el compromiso por la temporada completa.

### Display: precio "/mes" calculado, cobro anual

Aunque el cobro es anual, el precio se **muestra dividido por 12** para sentirse accesible. El total anual aparece debajo, en menor jerarquía.

| Plan | Precio anual | Display "/mes" |
|---|---|---|
| Pro Player (USD) | **USD 85 / año** | USD 7.08 /mes |
| Pro Player (ARS) | **ARS 131.999 / año** | ARS 10.999 /mes |
| Pro Player (EUR) | **EUR 73 / año** | EUR 6.08 /mes |
| Pro Agency (USD) | **USD 169 / año** *(a confirmar)* | USD 14.08 /mes |
| Pro Agency (ARS) | **ARS 264.999 / año** *(estimado proporcional, a confirmar)* | ARS 22.083 /mes |
| Pro Agency (EUR) | **EUR 146 / año** *(estimado proporcional, a confirmar)* | EUR 12.17 /mes |

> **Pro Agency incluye los 5 slots de Pro Player otorgables** sin costo adicional (ver sección G). El precio refleja ese valor: 5 × USD 79 = USD 395 si se compraran sueltos; con Pro Agency cuestan USD 169 + se suma el resto de las features de agencia.

**Patrón de display en las cards** (mockup):

```
USD 6.58 /mes
─────────────────
Facturado anualmente · USD 79 / año
```

- Precio "/mes" en grande con shimmer del display system (`bh-text-shimmer`).
- Línea inferior `text-xs text-bh-fg-3`: `Facturado anualmente · USD 79 / año`.
- En la `PricingComparisonTable` se muestra **sólo el total anual** (sin "/mes") para no duplicar.

### Localización por moneda

| Mercado | Moneda | Comportamiento |
|---|---|---|
| **Argentina** | ARS | Precio fijo en pesos (TBD valor exacto). Detección por geo-IP o toggle manual. |
| **España** | EUR | Precio en euros (TBD valor). |
| **Resto LatAm + resto del mundo** | USD | Default. |

- **Detección**: por geo-IP en server (Vercel Edge / middleware). Pasar `currency` como prop a `PricingPlans`.
- **Override manual**: toggle de moneda en la pricing page (ver sección 6).
- **Persistencia**: la elección manual se guarda en `localStorage` para mantenerla entre visitas.
- **Fallback**: si la geo-IP falla → USD.

### Trial

| Concepto | Decisión |
|---|---|
| Duración | 7 días gratis del plan **Pro** |
| Post-trial | Cobro automático **anual** (no hay otra opción) |
| Disclaimer en activación | "Tras 7 días te cobramos USD X automáticamente. Cancelable en cualquier momento durante el trial sin cargo." |
| Recordatorio | Email + notificación in-app a las 48h del corte (día 5) y 24h antes (día 6) |

### Refund policy

- **Ventana de cancelación sin cargo**: 3 días corridos posteriores al fin del trial.
- Es decir: 7 días de trial + 3 días de gracia post-cobro = **10 días desde el alta** para cancelar y obtener devolución total.
- Después de los 3 días post-trial, el cobro anual queda firme y **no hay devolución** (proporcional ni total).
- En el flow de activación del trial debe figurar explícitamente: "Cancelable sin cargo hasta 3 días después del cobro anual."

### Política de revisión de precios locales

- **Argentina (ARS)**: revisión **trimestral** (cada 3 meses). El equipo de producto define el ajuste según evolución del USD/ARS y poder adquisitivo.
- **España (EUR)** y resto: ajuste por excepción, no calendarizado todavía.
- No hay tracking automático ni dashboard interno por ahora — la decisión y el cambio se versionan en este mismo documento (Changelog) y se reflejan en `data.ts`.

### Procesador de pagos

| Moneda | Procesador |
|---|---|
| ARS | **Mercado Pago** (mejor compatibilidad local + métodos: tarjeta, débito, efectivo) |
| USD | **Stripe** |
| EUR | **Stripe** |

> El backend debe rutear al procesador correcto según la moneda elegida en el checkout. La moneda mostrada en la pricing page determina el cobro — no se convierte en el momento de pagar.

## 3. Matriz de features

### A · Identidad y perfil público

| Feature | Free Player | Pro Player | Free Agency | Pro Agency |
|---|---|---|---|---|
| URL pública personalizable | ✓ | ✓ | ✓ | ✓ |
| Plantilla **Default** | ✓ | — | ✓ | — |
| Plantilla **Pro Portfolio** (motions + assets pro) | — | ✓ | — | ✓ (versión agency) |
| Avatar | 1 | 1 | 1 | 1 |
| Galería catálogo (imágenes) | — | 5 | — | 5 |

### B · Conexiones externas (links)

| Feature | Free | Pro |
|---|---|---|
| Videos de YouTube | 2 | Ilimitados |
| Redes sociales | 3 | Ilimitadas |
| Links a noticias / prensa | 3 | Ilimitados |

> Aplica a **ambas** audiencias con los mismos límites.

### C · Información profesional (visible en perfil público)

| Feature | Free | Pro |
|---|---|---|
| Datos básicos (nombre, posición, club, edad) | ✓ | ✓ |
| Trayectoria | ✓ | ✓ |
| **Valores de mercado** | 🔒 gated | ✓ |
| **Valoraciones y logros** | 🔒 gated | ✓ |
| **Descripciones por etapa de carrera** | 🔒 gated | ✓ |

> Comportamiento `🔒 gated` definido en sección 4.

### D · Soporte y solicitudes

| Feature | Free | Pro |
|---|---|---|
| Solicitudes de corrección por **rubro** / semana | 2 | 5 |
| Centro de ayuda y comunidad | ✓ | ✓ |
| Soporte humano prioritario (24h SLA) | — | ✓ |

**Rubros que requieren revisión por admin**:
- Estadísticas
- Trayectoria / clubes
- Valores de mercado
- Logros
- Datos personales (DNI, fecha nacimiento, nacionalidad)

> El cap se aplica **por rubro**: ej. en Free podés pedir 2 correcciones de "Estadísticas" + 2 de "Trayectoria" + … en la misma semana. La ventana se reinicia cada 7 días desde la última solicitud aprobada.

### E · SEO

| Feature | Free | Pro |
|---|---|---|
| Meta tags básicos + OG mínimo | ✓ | ✓ |
| Schema.org `Person` / `SportsOrganization` | — | ✓ |
| OG image dinámica (avatar + stats overlay) | — | ✓ |
| Sitemap dedicado e indexación priorizada | — | ✓ |
| Alt-tags optimizados en multimedia | — | ✓ |

### F · Validación social

| Feature | Free | Pro |
|---|---|---|
| **Reviews recibidas** | 🌫️ blurred (módulo visible en blur con upgrade CTA) | ✓ con invitación |
| **Contactos de referencia** | — | ✓ |
| Espontáneas no permitidas | — | (todas son por invitación) |

> El módulo de reviews **todavía no está construido**. Cuando se implemente, los Free verán el módulo en su URL pública con `filter: blur(8px)` + overlay con CTA "Activá Pro para recibir reviews".

**Qué son "Contactos de referencia"**:
El jugador (o agencia) carga datos de contacto de referentes profesionales que pueden dar opinión sobre él/ella. Funciona como las "references" de un CV clásico. Ejemplos:
- Un DT con el que trabajó (nombre + email + teléfono opcional)
- Un preparador físico
- Un capitán o compañero
- Un dirigente o coordinador

Cada contacto se muestra en el perfil público con: nombre, rol/relación, y los datos de contacto que el jugador eligió exponer. El visitante (club / scout) puede contactarlos directamente para validar referencias.

> **Diferencia con Reviews**: las reviews son texto que el referente escribe sobre el jugador (necesita invitación + flow de aceptación). Los contactos de referencia son sólo info de contacto que el jugador publica unilateralmente — no requiere acción del referente.

### G · Solo audiencia Agency

| Feature | Free Agency | Pro Agency |
|---|---|---|
| Members del equipo (incluyendo owner) | 2 | Ilimitados |
| Cartera de jugadores representados | hasta 5 (todos en plantilla Default) | Ilimitada |
| **Slots de Pro Player otorgables a representados** | — | 5 (rotables) |

**Cómo funcionan los slots Pro otorgables (Pro Agency)**:
- La agencia tiene **5 slots**.
- Cada slot puede asignarse a un jugador **de su cartera** → ese jugador queda con plan Pro Player mientras esté asignado.
- Si la agencia **suelta al jugador** (lo saca de la cartera), el slot **se libera** y el jugador vuelve a Free Player.
- Si el jugador **ya tenía Pro propio**, asignarle un slot **no consume el slot de la agencia** (se "ahorra"; mientras la suscripción del jugador esté activa, el slot queda disponible para otro).

> **Status**: lógica decidida, **implementación TBD**. Se construye en una iteración posterior al MVP de pricing.

### H · Roadmap (badges "Próximamente" en Pro)

> Estas features se muestran en las cards y panel detail pero con badge `Coming soon` y sin contar como features actuales.

**Pro Player**:
- 📊 Estadísticas del perfil (visitas, veces compartido, lista de visitantes con rol/club)
- 🔍 Inclusión en base de datos pública para scouting (presencia destacada)
- 🌟 Acceso premium a cartera de jugadores libres (visible para reps & scouts)

**Pro Agency**:
- 📊 Estadísticas del perfil de agencia (ídem player)
- 📧 Recomendación de perfiles por email a contactos del CRM
- 🆓 Call-ups: feed de jugadores libres sin agente o que buscan equipo

## 4. Patrones de gating (UX)

Cada feature gated en Free usa **uno** de estos 4 patrones. La elección no es arbitraria — se decide caso por caso.

### Patrón 1 · Hard cap con modal de upgrade
**Cuándo**: el feature está disponible hasta un límite numérico (ej. 3 redes sociales, 2 correcciones / semana).
**UX**:
- Hasta el límite, todo funciona normal.
- Al intentar agregar el N+1, modal: "Llegaste al límite del plan Free. Pasá a Pro para tener X ilimitado." con CTA al checkout.

**Aplica a**:
- Videos YouTube (2 max), redes sociales (3 max), links noticias (3 max)
- Solicitudes de corrección (2/rubro/semana)
- Cartera Agency (5 max)
- Members Agency (2 max)
- Slots Pro otorgables (5 max para Pro Agency cuando llegue)

### Patrón 2 · Soft gate en el save (campo editable, no guardable)
**Cuándo**: queremos que el usuario *vea* el campo y se entusiasme con escribir, pero no podemos dejarlo guardar.
**UX**:
- El campo aparece en el dashboard editable, con un badge `Pro` al lado del label.
- El usuario puede tipear normalmente.
- Al hacer click en `Guardar`, se intercepta y se abre un modal: "Este campo es parte del plan Pro. Mejorá tu plan para guardarlo."
- CTA del modal: `Ver planes` o `Activar trial 7 días`.

**Aplica a**:
- Valores de mercado (Player & Agency)
- Valoraciones y logros (Player & Agency)
- Descripciones por etapa de carrera (Player)

> **Nota**: el contenido tipeado se descarta al cerrar el modal sin upgrade. No se persiste localmente para evitar fugas o expectativas falsas.

### Patrón 3 · Visible pero blurred con upgrade CTA
**Cuándo**: queremos que terceros (visitantes del perfil público) entiendan que existe un feature pero no puedan verlo.
**UX**:
- En la URL pública del Free, el módulo se renderiza con `backdrop-filter: blur(8px)` o `filter: blur(8px)`.
- Encima, overlay semi-transparente con texto: "Este perfil aún no activó Pro" + CTA `Sumar reseña` o `Conocer planes`.
- En el dashboard del owner Free, el módulo aparece desactivado con CTA inline: `Activar Pro`.

**Aplica a**:
- Reviews recibidas
- (Cuando lleguen) Estadísticas del perfil para terceros

### Patrón 4 · Hidden / no rendered
**Cuándo**: el feature simplemente no debe aparecer.
**UX**:
- En la URL pública del Free, el módulo no se renderiza (ni placeholder ni blur).
- En el dashboard del owner Free, el feature aparece como bloqueado con badge `Pro` pero el usuario puede previsualizar la experiencia con dummy data.

**Aplica a**:
- Plantilla Pro Portfolio (motions + assets) — el Free usa default
- Galería catálogo
- Listado de profesionales recomendados

## 5. Mapeo audiencia × plan a copy y CTAs

### Player

| Plan | Tagline | CTA principal | CTA secundario |
|---|---|---|---|
| Free | "Empezá a construir tu identidad" | `Crear mi perfil gratis` | `Ver Pro` |
| Pro | "Visibilidad real ante clubes" | `Probar 7 días gratis` | `Ver comparación` |

### Agency

| Plan | Tagline | CTA principal | CTA secundario |
|---|---|---|---|
| Free | "Mostrá tu agencia" | `Crear cuenta gratis` | `Ver Pro` |
| Pro | "Trabajá con stack profesional" | `Probar 7 días gratis` | `Hablar con ventas` |

> Los textos exactos los pulimos cuando el copy esté listo. Esto es estructura.

## 6. Toggles en la pricing page

La pricing page tiene **dos** toggles. El toggle viejo de `Mensual / Anual` se elimina (no hay mensual).

### Toggle audiencia: Player ↔ Agency

- Estado: `audience: "player" | "agency"`, default `"player"`.
- Posición: justo debajo del hero, antes de las cards.
- Estilo: pill toggle de 2 opciones.
- Persistencia: `sessionStorage` durante la sesión. No persistir entre visitas (cada visita arranca en `player` salvo deep-link).
- Deep-link: `/pricing?audience=agency` fuerza la audiencia.
- Animación: cambio de toggle → crossfade rápido (180ms) entre las 2 cards y el detail panel. La comparison table también re-renderiza.

### Toggle moneda: USD ↔ ARS ↔ EUR

- Estado: `currency: "USD" | "ARS" | "EUR"`, default según geo-IP detectada en server.
- Posición: top-right de las cards (chico, pill o select compacto), o junto al toggle audiencia.
- Persistencia: la elección manual se guarda en `localStorage` (sí persistente entre visitas).
- Override del default: si el user tiene `localStorage.currency`, usa eso. Si no, usa el detectado por geo-IP. Si no, USD.
- Deep-link: `/pricing?currency=ARS` fuerza la moneda.
- Cuando cambia: re-render del precio en cards + comparison table sin refresh. Animación opcional (fade del número, 120ms).

> **Nota**: el sistema de billing real (Stripe / Mercado Pago / etc) tiene que respetar la moneda mostrada al momento del checkout. Si el user vio precios en ARS y va al checkout, ahí se debe cobrar en ARS — no convertir a USD.

## 7. Cosas que el sistema actual tiene y hay que **eliminar**

- **Plan Elite Scouting** (3era card actual). Reemplazado por el modelo de 2 planes × 2 audiencias.
- **Toggle `Mensual / Anual`** del hero. No hay mensual; se reemplaza por el toggle de moneda.
- **Datos placeholder de Pro Player** que no concuerdan con esta matriz (features que no aparecen acá deben removerse).
- **Disclaimer "Hablar con ventas"** como CTA principal — ahora es secundario sólo en Pro Agency.
- **Texto `$—`** en las cards — reemplazar por los precios reales (USD 6.58 /mes, USD 14.08 /mes calculados).

## 8. Open questions

> Listado vivo. Cuando algo se decida, mover a la sección correspondiente y borrar de acá.

1. **Precio Pro Agency en USD** — actualmente USD 169 (heredado del draft anterior). Confirmar si sube proporcionalmente con el aumento de Player a USD 85, o se mantiene.
2. **Precio Pro Agency en ARS** — placeholder ARS 264.999 calculado proporcional a Player (131.999 × 169/85 = 262.499, redondeado). A confirmar.
3. **Precio Pro Agency en EUR** — placeholder EUR 146 calculado proporcional a Player (73 × 169/85). A confirmar.
4. ¿Cuántas reviews/invitaciones puede mandar un Pro por semana? ¿Hay cap?
5. Roadmap timing: ¿qué quarter aspiramos para cada feature `Coming soon`?
6. ¿Cómo se notifica el ajuste trimestral de ARS a usuarios existentes con suscripción activa? ¿El precio queda lockeado al alta o sube en la renovación?

## 9. Changelog

- **2026-05-03 (v3)** — Precios Player concretados (USD 85, ARS 131.999, EUR 73). Refund policy definida (3 días post-trial = 10 días total). Política trimestral de revisión ARS confirmada. Procesadores asignados (Mercado Pago para ARS, Stripe para USD/EUR). "Listado de profesionales recomendados" renombrado a **"Contactos de referencia"** y se aclaró el módulo (info de contacto unilateral, no requiere acción del referente). Pro Agency queda con precios estimados proporcionales pendientes de confirmación.
- **2026-05-03 (v2)** — Pricing model simplificado. Sólo cobro anual (eliminado mensual). Precios USD definidos: Pro Player USD 79/año, Pro Agency USD 169/año. Display "/mes" calculado. Localización por moneda (ARS Argentina, EUR España, USD resto). Toggle de moneda agregado a la pricing page. Open questions actualizadas (cerradas las de cadencia/descuento, abiertas las de precios locales y procesador de pagos).
- **2026-05-03 (v1)** — Draft inicial consolidado a partir de notas-sketch del owner. 10 decisiones tomadas, 8 open questions pendientes.
