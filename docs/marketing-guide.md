# Guía de marketing — BallersHub

Cómo usar el sistema de email marketing sin tocar código.

---

## Qué hace el sistema por vos

El sistema se ocupa de:

- Mandar **emails de bienvenida** automáticos a cada usuario nuevo.
- Hacer **seguimiento** a quien dejó su email en un perfil pero no terminó de registrarse.
- **Recordarle** al jugador completar su perfil si pasaron días y no lo hizo.
- Permitirte armar **campañas puntuales** ("anuncio Pro", "novedades del mes") con un wizard sin escribir código.
- **Cuidar la reputación de tu dominio** automáticamente: bloquea direcciones que rebotan, gente que se desuscribe, y los que dejan de abrir tus emails.

Vos solo intervenís cuando querés mandar un mensaje específico. El resto corre solo.

---

## El sistema en 30 segundos

```
┌──────────────────────────────────────────────────────────────────┐
│  AUTOMÁTICO  (sin que toques nada)                                │
│                                                                   │
│  Visitante deja email en portfolio  →  email "acceso desbloqueado"│
│                                                                   │
│  Usuario nuevo se registra           →  bienvenida en 5 min       │
│                                      →  recordatorio día 3        │
│                                      →  recordatorio día 7        │
│                                         (saltea si ya completó)   │
│                                                                   │
│  Cada email enviado                  →  trackea apertura + clicks │
│                                      →  baja a "cold" si no abre  │
│                                      →  desuscribe a los 6 sin    │
│                                         abrir                     │
│                                                                   │
│  Alguien hace bounce / unsub         →  se filtra para siempre    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  MANUAL  (decisión tuya)                                          │
│                                                                   │
│  Campañas puntuales desde /admin/marketing/new                    │
│  Pausar/reactivar drips automáticos                               │
│  Revisar engagement y actuar sobre cold + dormant                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## Las 3 audiencias y cómo se llenan

Tu lista de marketing tiene **una sola lista unificada** (`marketing_subscriptions`) que se va llenando de tres fuentes distintas:

| Cómo llega | Cuándo | Consentimiento inicial |
|---|---|---|
| **Signup** | Usuario se registra en BallersHub | Producto: ✅ · Promos: ❌ · Pro features: ❌ |
| **Lead de portfolio** | Visitante deja email para ver contactos de un jugador | Producto: ✅ · Promos: ❌ · Pro features: ❌ |
| **Import manual** | Vos cargás emails desde el admin (futuro) | Lo definís vos |

Cada suscriptor tiene 3 toggles de consentimiento por categoría:

- **Producto**: novedades del producto, nuevos perfiles destacados.
- **Promos**: ofertas, descuentos, planes Pro.
- **Pro features**: features avanzadas dirigidas a Pro players.

Cuando armás una campaña, podés filtrar por consentimiento. Si una persona dijo que NO quiere promos, jamás recibe una campaña marcada como tal.

---

## Lo que se ejecuta solo

### 1. Bienvenida automática al registrarse

Cuando alguien firma por primera vez, dispara automáticamente:

- **Día 0** (en los próximos ~5 min): email de bienvenida con los 3 pasos para armar su perfil.
- **Día 3**: recordatorio "te falta poco" con detalle de cuántas secciones quedan.
- **Día 7**: segundo recordatorio si todavía no completó.

**Salteo inteligente**: si la persona completa su perfil entre el día 3 y el día 7, el recordatorio del día 7 NO se manda. El sistema chequea antes de enviar.

### 2. Confirmación al dejar email en un portfolio

Cuando un visitante anónimo deja su mail en el módulo de contacto de un perfil pro, recibe inmediatamente:

- Email "acceso desbloqueado" con el nombre del jugador que vio.
- Invitación suave a crear cuenta gratis.
- Avisamos que le vamos a mandar updates sobre nuevos perfiles.

Estos leads quedan en tu lista marcados como source `portfolio_lead` y son la audiencia natural para campañas tipo "este mes se sumaron 5 nuevos jugadores".

### 3. Limpieza automática de la lista

**Todos los días el sistema baja la basura solo:**

- Direcciones que rebotaron permanente (correo que ya no existe) → suprimidas.
- Personas que marcaron tu email como spam → suprimidas.
- Personas que pidieron desuscribirse → suprimidas.
- Personas que recibieron 6 emails consecutivos sin abrir ninguno → suprimidas (esto se llama "auto-cooldown").

Esto último es CRÍTICO. Mandar emails a gente que nunca abre es como enviar cartas a una casa abandonada: te baja la reputación con Gmail/Outlook y todos tus emails empiezan a caer en spam, también para los suscriptores activos.

---

## Cómo se clasifica tu lista (engagement tiers)

Cada suscriptor tiene un **tier** que se actualiza solo:

| Tier | Definición | Tratamiento |
|---|---|---|
| 🟢 **Active** | Abrió el último email o nunca recibió ninguno | Recibe TODO |
| 🔵 **Warm** | 1-2 emails seguidos sin abrir | Recibe TODO |
| 🟡 **Cold** | 3-5 emails seguidos sin abrir | **Se puede excluir** desde el wizard (default ON) |
| 🔴 **Dormant** | 6+ emails seguidos sin abrir | **Auto-suprimida** |

**El contador se resetea apenas la persona abre o clickea cualquier email.** No es una sentencia perpetua: si alguien estaba cold y vuelve a abrir uno, vuelve a active inmediatamente.

**Por qué importa**: Gmail mide tu "sender reputation" en parte por el porcentaje de tus emails que la gente realmente abre. Si seguís mandando a no-engagers, esa métrica baja y todos tus emails empiezan a caer en spam también para los que sí abrirían. El tier-based exclusion protege esa métrica.

---

## Las pantallas del admin

Toda la gestión está en el dashboard, accesible solo con role `admin`.

### `/admin/marketing` — Vista principal

Muestra:

- **4 KPIs arriba**: suscriptores totales, desuscriptos, enviados últimos 30 días, open rate últimos 30 días.
- **Engagement breakdown**: barra de 4 colores con la distribución (active / warm / cold / dormant) y los porcentajes.
- **Tabla de campañas**: las últimas 50 con su estado, recipients, open%, click%, y acciones.
- **Botón "Nueva campaña"** prominente arriba a la derecha.

### `/admin/marketing/new` — Wizard para crear campaña

Pantalla partida en dos: a la izquierda el formulario, a la derecha **un preview en vivo del email** (se actualiza cada vez que tocás algo).

El formulario tiene 3 secciones:

1. **Identidad**: nombre interno, slug auto-generado, subject (lo que se ve en la bandeja), preheader (texto preview opcional).

2. **Audiencia**:
   - Segmento: todos los suscriptos / registrados sin perfil / pro players / leads recientes / lista custom.
   - Si elegís "leads recientes": ventana en días.
   - Si elegís "todos los suscriptos": qué consentimiento exigís (producto / promos / pro features / cualquiera).
   - Si elegís "lista custom": pegás emails uno por línea.
   - Checkbox "Excluir cold" (por default ON, recomendado).
   - **Estimación en vivo**: te muestra 3 números — cuántos califican / cuántos quedan después de suppression / cuántos quedan después del cap de frecuencia. El último número es el que realmente recibe.

3. **Contenido**:
   - Eyebrow (opcional, pequeña etiqueta lime arriba del título).
   - Headline (título grande).
   - Body (texto del cuerpo, separás párrafos con líneas en blanco).
   - CTA Label + URL (opcional, botón).
   - Postscript (opcional, texto chico al final).

Al pie:

- **Guardar borrador**: queda en estado "draft" para mandar más tarde.
- **Enviar ahora**: te pide confirmación con el número final de destinatarios y dispara.

### `/admin/marketing/<id>` — Detalle de una campaña

- KPIs específicos: destinatarios, sent, delivered, open rate, click rate, bounce rate, complaint rate.
- Si bounce > 5% o complaint > 0.1%: aparecen en rojo (señal de alerta).
- Snapshot del filtro de audiencia que usaste (auditoría).
- Tabla de los últimos 50 envíos individuales con el estado de cada uno.
- Si la campaña está en draft / scheduled / failed: botón **Enviar ahora** o **Reintentar**.

### `/admin/marketing/drips` — Drips automatizados

Lista los flows automáticos. Hoy hay 3 configurados:

| Drip | Trigger | Delay | Salteo |
|---|---|---|---|
| Bienvenida — jugador (inmediata) | Signup | 0 | nunca |
| Profile completion · Día 3 | Signup | 3 días | si ya completó perfil |
| Profile completion · Día 7 | Signup | 7 días | si ya completó perfil |

Cada uno tiene:

- Contadores de pendientes / enviados / exited+cancelled.
- Switch lime para **pausar/reactivar**. Al pausar: nuevos signups dejan de enrolarse, pero los que ya están en cola se siguen mandando.

### `/admin/marketing/engagement` — Detalle de engagement

- Misma barra de 4 segmentos que en la vista principal pero más grande.
- Tabla de **referencia** con las reglas de tier.
- **At-risk**: top 100 suscriptores más cold/dormant ordenados por skipped descendente. Te muestra:
  - Email
  - Tier actual
  - Total sends / opens / clicks
  - Cuántos sends seguidos sin abrir
  - Última actividad
  - Source (de dónde vino)

Esta lista te dice quién está a punto de pasar a dormant. Si querés salvarlos antes, podés mandar una campaña de re-engagement con un asunto distinto.

---

## Cómo mandar tu primera campaña — paso a paso

Imaginate que querés anunciar el lanzamiento de una nueva feature.

1. Andá a `/admin/marketing` y click en **"Nueva campaña"**.

2. **Identidad**:
   - Nombre: `Lanzamiento dashboard mejorado`
   - Slug: se autocompleta como `lanzamiento-dashboard-mejorado`
   - Subject: `🚀 Nuevo dashboard, más rápido y completo`
   - Preheader: `Te contamos en 30 segundos`

3. **Audiencia**:
   - Segmento: **Todos los suscriptos**
   - Consentimiento requerido: **Producto / nuevos perfiles**
   - Excluir cold: ✅
   - Mirá la estimación: digamos te dice "Candidatos: 247 / Tras suppression: 232 / Final: 198". 198 es a quién le va a llegar.

4. **Contenido**:
   - Eyebrow: `Nuevo`
   - Headline: `Dashboard renovado`
   - Body:
     ```
     Estuvimos trabajando en una nueva versión del dashboard para
     que armar tu perfil sea más rápido y claro.

     Ahora podés cargar trayectoria, multimedia y stats sin saltar
     entre páginas. Todo en una sola vista.

     Probalo y contanos qué te parece.
     ```
   - CTA Label: `Ir al dashboard`
   - CTA URL: `https://ballershub.co/dashboard`

5. Mirá el preview a la derecha — así se ve realmente en la bandeja.

6. **Enviar ahora** → confirmás → se manda en 1-2 minutos.

7. Volvés a `/admin/marketing` → entrás al detalle → ves los opens y clicks llegando en vivo.

---

## Playbooks (recetas comunes)

### "Quiero avisar a todos los registrados que no completaron su perfil"

- Audiencia: **Registrados sin perfil**
- Consentimiento: cualquiera
- Template: custom_broadcast con un mensaje accionable
- CTA: link al dashboard de edición

⚠️ Si vas a hacer esto, primero pausá el drip "Profile completion d3" y "d7" desde `/admin/marketing/drips` para no duplicar mensajes la misma semana.

### "Quiero un anuncio mensual a leads que dejaron mail en perfiles"

- Audiencia: **Leads recientes (portfolio)** ventana 30 días
- Excluir cold: ✅
- Subject ideal: `5 perfiles nuevos en BallersHub que te van a interesar`
- Cadencia: máximo 1 vez por mes para no quemar la audiencia.

### "Quiero re-enganchar a los que están cold antes que pasen a dormant"

- Audiencia: **Custom** — pegás los emails de la lista de at-risk de `/admin/marketing/engagement`
- Excluir cold: ❌ (acá los QUERÉS incluir)
- Subject distinto al habitual, algo intrigante: `¿Sigue activa esta dirección?` o `Última oportunidad para no perderte esto`
- Body corto, una sola pregunta o un gancho que valga la pena abrir.
- Si después de esto siguen sin abrir, déjalos pasar a dormant — el sistema los va a auto-limpiar.

### "Quiero testear un mensaje antes de mandarlo masivo"

- Audiencia: **Lista custom**
- Pegás 2-3 emails tuyos / del equipo
- Mandás a esa lista
- Verificás que el preview real se ve bien, que el CTA funciona, que no hay typos
- Después armás la versión real con la audiencia correcta

### "Mandé una campaña y quiero ver cómo va"

- `/admin/marketing` → click en el nombre de la campaña → entrás al detalle.
- Refresh cada tanto: los KPIs se actualizan a medida que Resend nos manda los webhooks.
- Si bounce rate > 5% o complaint > 0.1%, hay que parar y revisar (probablemente lista vieja o mensaje agresivo).

---

## Métricas a vigilar

Las 4 que importan, en orden de importancia:

| Métrica | Meta | Qué significa si está mal |
|---|---|---|
| **Complaint rate** | < 0.1% | Tu mensaje se siente como spam. Subject muy agresivo, audiencia equivocada, frecuencia alta. **Para todo y revisar**. |
| **Bounce rate** | < 2-3% | Lista vieja con direcciones inválidas. Si > 5%, alguna fuente de leads está cargando emails falsos. |
| **Open rate** | > 20% (B2C) | Subject poco atractivo o lista cansada. Probá A/B de subjects o limpiá cold subscribers. |
| **Click rate** | > 2-3% | El contenido no resuena. Mirá si el CTA es claro y relevante para la audiencia segmentada. |

**Regla de oro**: si una sola campaña dispara complaint rate > 0.5%, algo grave pasó. **No mandes más** hasta entender qué fue.

---

## Cuidados que el sistema aplica solo (para que duermas tranquilo)

### Suppression list
Toda dirección que se desuscribió, rebotó hard, marcó como spam, o pasó a dormant **se filtra automáticamente** de TODA campaña futura. No hay forma de mandarle un email a alguien suprimido salvo que lo des-suprimás manualmente (cosa que requiere razón muy clara).

### Frequency cap
Nadie recibe más de 1 email de marketing cada 5 días, incluso si calificaría para varias campañas/drips simultáneamente. Esto te protege de bombardeo accidental.

### Engagement-based filtering
Dormant siempre se excluye. Cold se puede excluir con el toggle (default ON). Esto es lo que diferencia un sistema profesional de uno amateur.

### Unsubscribe en un click
Cada email tiene un link "desuscribite acá" en el footer + un header `List-Unsubscribe` que Gmail/Outlook usan para mostrar el botón nativo de "Cancelar suscripción" en su UI. Eso es CRÍTICO para mantener trusted-sender status — si lo escondés, Gmail castiga.

### Confirmación al enviar
"Enviar ahora" siempre pide confirmación con el número exacto de destinatarios. Imposible mandar masivo por error.

### Idempotencia
Si por algún motivo el sistema corre la misma campaña dos veces (ej: cron concurrente), nadie recibe duplicado. Cada (campaña, email) tiene una sola fila.

---

## Glosario de 30 segundos

| Término | Qué es |
|---|---|
| **Suscriptor** | Cualquier email que entró a `marketing_subscriptions` (signup, lead, import). |
| **Suppression list** | Lista de emails que NUNCA reciben marketing (unsubs + bounces + complaints + dormants). |
| **Drip** | Email automático disparado por un evento (ej: signup) con un delay (ej: 3 días después). |
| **Campaña** | Email puntual disparado manualmente desde el admin. |
| **Trigger event** | El evento que dispara enrollments en un drip. Hoy: `player_signup`. |
| **Audience filter** | El conjunto de reglas para definir a quién va una campaña. |
| **Frequency cap** | Tope de cuántos emails de marketing puede recibir una persona en X días. Hoy: 1 cada 5 días. |
| **Engagement tier** | Clasificación automática de cuán activo está un suscriptor (active / warm / cold / dormant). |
| **Open rate** | % de emails entregados que fueron abiertos. |
| **Click rate** | % de emails entregados donde se clickeó algún link. |
| **Bounce** | Email que no se pudo entregar. Hard = permanente (cuenta no existe), soft = temporal (buzón lleno). |
| **Complaint** | Cuando alguien marca tu email como spam. Resta MUCHO en la reputación. |
| **Preheader** | Texto chico que aparece al lado del subject en la bandeja, sirve de "subtítulo". |
| **CTA** | Call-to-action: el botón principal que querés que la persona clickee. |

---

## Cuándo intervenir / cuándo dejar al sistema solo

### El sistema se ocupa solo de:
- Mandar bienvenida a nuevos signups.
- Mandar confirmación a leads de portfolio.
- Mandar recordatorios día 3 y día 7 a quien no completó perfil.
- Suprimir bounces hard.
- Suprimir complaints.
- Suprimir dormants (6+ sin abrir).
- Cancelar drips pendientes cuando alguien se desuscribe.
- Recomputar tier de engagement con cada apertura/click.

### Vos decidís cuándo:
- Mandar una campaña puntual / anuncio.
- Pausar un drip si vas a hacer una comunicación que se solaparía.
- Crear nuevos drips o templates (requiere tocar código).
- Hacer una campaña de re-engagement a cold antes que pasen a dormant.
- Importar leads de fuentes externas (futuro).
- Decidir frequency cap más estricto si tu lista es chica y querés cuidar más.

---

## Errores comunes y cómo evitarlos

### "Mandé a 500 y solo recibieron 200"
Es lo correcto. Los otros 300 fueron filtrados por suppression + frequency cap + engagement. **Eso te protege**, no es un bug. Mirá el detalle de la campaña: el delta entre "candidates" y "final" es exactamente cuántos te ahorraste de quemar.

### "Mi open rate viene cayendo cada campaña"
Probable causa: estás incluyendo demasiados cold/warm. Soluciones:
- Activá "excluir cold" en el wizard (debería estar siempre).
- Hacé una campaña de re-engagement antes de seguir mandando.
- Bajá la frecuencia general (cada 14 días en vez de cada 7).

### "Mi complaint rate subió"
Para todo. No mandes nada hasta entender. Probable causa:
- Audiencia mal segmentada (ej: mandando promos a gente que solo dio consent product).
- Subject que parece spam ("GANÁ AHORA", todo en mayúsculas, $$$).
- Frecuencia muy alta para esa audiencia.

### "Pausé un drip y los nuevos signups siguen recibiendo el email"
Esos eran los que ya estaban en cola. El switch detiene **nuevos enrollments**, no los pendientes. Si querés cancelar los pendientes, requiere intervención técnica (DB query).

### "Quiero mandar HOY pero la audiencia me da 0"
Posibles causas:
- Tu lista es muy chica.
- Frecuencia: ya recibieron algo en los últimos 5 días.
- Filtros muy agresivos (consentimiento + cold exclusion + suppression todos juntos).

Aflojá los filtros uno por uno: primero "excluir cold" off, después cambia consentimiento a "cualquiera", después amplía el segmento.

### "Resend dice que mi dominio tiene mala reputación"
Acción inmediata:
1. **Pausá todos los drips**.
2. No mandes más campañas por al menos 7 días.
3. Revisá complaint rate y bounce rate de las últimas 3 campañas.
4. Si encontrás una que disparó la cosa, identificala y aprendé.
5. Volvé gradualmente: primero a active-only, frecuencia mensual.

---

## Checklist antes de enviar cualquier campaña

- [ ] El subject NO tiene mayúsculas exageradas, signos $$$, palabras tipo "GRATIS YA"
- [ ] El preheader complementa al subject (no lo repite)
- [ ] El body tiene al menos 2 párrafos
- [ ] Si hay CTA, el link funciona
- [ ] El preview se ve bien en el iframe
- [ ] La audiencia final (después de filtros) es razonable (no 5 personas, no 5000 si tu lista total es 1000)
- [ ] El consentimiento que pediste matchea el contenido (no mandes promos a quien dio solo "producto")
- [ ] Mandé un test a mi propio email primero
- [ ] Es la primera comunicación marketing en al menos 5 días para esta audiencia
- [ ] Si pausé algún drip que se solaparía, ya lo despauzo o lo dejo pausado durante esta campaña

---

## Resumen final en 5 líneas

1. Cuando alguien firma o deja un email en un perfil, el sistema le manda lo correcto solo.
2. Cuando vos querés mandar un mensaje específico, vas al wizard, completás 3 secciones, click "enviar".
3. El sistema te protege solo: filtra unsubs, bounces, dormants, y respeta el cap de frecuencia.
4. Vigilá 4 métricas: complaint, bounce, open, click. La primera es la más importante.
5. Cuando un drip y una campaña tuya van a competir, pausá el drip primero.

---

**Última actualización del sistema**: Phase 5 — Engagement segmentation + auto-cooldown.

**Próximas mejoras planeadas (opcionales)**:
- A/B testing de subjects desde el wizard.
- Scheduling con date picker (hoy solo "enviar ahora").
- Wizard expone también `lead_welcome` y `profile_completion` (hoy son auto-trigger only).
- Re-opt-in flow (alguien suprimido se vuelve a suscribir desde una landing).
- Lifecycle dashboard temporal (cuántos pasan de active→cold por semana).
