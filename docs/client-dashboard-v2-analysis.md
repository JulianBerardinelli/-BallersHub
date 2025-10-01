# Client dashboard V2 – análisis integral

## 1. Contexto recopilado
- El roadmap vigente define V2 como la fase de "Profile publishing", enfocada en habilitar CRUD para trayectoria, enlaces, logros, multimedia con estados y personalización de plantilla (`profile_theme_settings`, `profile_sections_visibility`).【F:docs/client-dashboard-roadmap.md†L33-L46】
- Las páginas del dashboard ya muestran estructuras de formulario y secciones para datos personales, deportivos, multimedia y plantilla, pero aún funcionan como placeholders sin persistencia ni validaciones (ej. `FormField` solo renderiza contenido estático).【F:src/app/(dashboard)/dashboard/edit-profile/personal-data/page.tsx†L203-L285】【F:src/app/(dashboard)/dashboard/edit-profile/football-data/page.tsx†L205-L351】【F:src/app/(dashboard)/dashboard/edit-profile/multimedia/page.tsx†L99-L190】
- El esquema actual concentra información personal en `player_profiles` y `player_personal_details`, trayectoria en `career_items`, multimedia en `player_media` y estadísticas en `stats_seasons`. La vista `player_dashboard_state` hidrata el dashboard combinando perfil, solicitud y suscripción en una sola consulta.【F:src/db/schema.sql†L1123-L1168】【F:src/db/schema.sql†L1051-L1060】【F:src/db/schema.sql†L1108-L1117】【F:src/db/schema.sql†L1319-L1332】【F:src/db/schema.sql†L1190-L1247】

## 2. Brecha entre roadmap y estado actual

| Sección | Expectativa roadmap | Estado en la app | Impacto |
| --- | --- | --- | --- |
| Datos personales | V1 daba por completo el mapeo y sincronización de campos básicos, dirección y avatar.【F:docs/client-dashboard-roadmap.md†L21-L25】 | La UI muestra los campos pero no permite editar ni persistir (solo AvatarUploader guarda en storage). No hay validación ni feedback de guardado.【F:src/app/(dashboard)/dashboard/edit-profile/personal-data/page.tsx†L179-L285】 | Requiere crear formularios reales, mutaciones Supabase y toasts para confirmar cambios; además falta CRUD para `player_personal_details` y auditoría por campo.
| Datos futbolísticos | V2 exige CRUD de `career_items`, gestión de links (`player_links`), logros (`player_honours`) y stats (`stats_seasons`).【F:docs/client-dashboard-roadmap.md†L33-L36】 | Página lista datos pero sin acciones: trayectoria es lectura simple, formulario de enlaces no guarda, campos de contrato/logros/objetivos no están respaldados por tablas.【F:src/app/(dashboard)/dashboard/edit-profile/football-data/page.tsx†L205-L351】 | Se necesitan formularios con listas editables, reordenamiento, triggers para teams y tablas nuevas para enlaces, logros y metas.
| Multimedia | Roadmap indica uploader con visibilidad, metadata JSONB y moderación.【F:docs/client-dashboard-roadmap.md†L38-L41】 | Secciones son placeholders (grids estáticos). `player_media` carece de columnas para visibilidad/metadatos.【F:src/app/(dashboard)/dashboard/edit-profile/multimedia/page.tsx†L99-L190】【F:src/db/schema.sql†L1108-L1117】 | Hay que incorporar storage uploader, estados (draft/public), etiquetas y flujo de revisión. Posible necesidad de tablas auxiliares (tags, press notes).
| Plantilla | Debe persistir layout/colores y toggles en nuevas tablas.【F:docs/client-dashboard-roadmap.md†L43-L46】 | UI muestra presets sin interacción real ni persistencia; tablas aún no existen.【F:src/app/(dashboard)/dashboard/edit-template/styles/page.tsx†L57-L124】 | Se requiere diseñar esquema `profile_theme_settings` y `profile_sections_visibility`, endpoints y sincronización con vista previa.

## 3. Diseño propuesto para la edición de datos

### 3.1 Principios de UX
- **Edición por secciones**: Mantener formularios agrupados (datos personales, contacto, trayectoria, multimedia) con botones "Guardar cambios" por bloque para minimizar errores y facilitar feedback contextual.
- **Feedback inmediato**: Usar toasts de éxito/advertencia por sección y resaltar campos con errores. Integrar `TaskCalloutList` para actualizar estado de tareas tras guardar.
- **Edición incremental**: Permitir guardar campos parciales sin bloquear otros bloques; mostrar indicadores de último guardado usando `profile_change_logs` como timeline.

### 3.2 Arquitectura técnica
- Adoptar `react-hook-form` + `zod` en cada sección para validar antes de enviar y mapear estructuras complejas (arrays, nested objects).
- Centralizar mutaciones en un servicio `updatePlayerProfileSection` que reciba `sectionId` y payload normalizado; internamente ejecutará transacciones Supabase (`rpc` o `from().upsert`) y registrará `profile_change_logs` por campo crítico.
- Implementar un `useSectionSaving` hook que maneje estados `idle | saving | saved | error`, actualice caches de `player_dashboard_state` y refresque datos server-side usando `revalidatePath`.
- Para listas (career, multimedia, press notes), crear componentes tipo `EditableCollection` con soporte para reordenamiento (drag-and-drop) y modales de edición inline.

### 3.3 Manejo de multimedia
- Integrar uploader a Supabase Storage con colas de procesamiento opcionales. Cada item tendrá estados `draft/published/hidden` y flags `needs_review`, `review_status` para moderación.
- Permitir etiquetar `usage_context` (perfil público, prensa, CV) via checkboxes alimentadas por metadata JSONB.
- Gestionar portada con `is_primary` existente y endpoint para garantizar unicidad.

### 3.4 Auditoría y versionado
- Ampliar `profile_change_logs` registrando `section`, `field`, `previous`, `current`, `performed_by`. Mostrar en UI un historial por sección para transparencia.
- Considerar snapshots para colecciones (ej. versión de plantilla) guardando `version` incremental.

## 4. Modelo de datos vs inputs del dashboard

### 4.1 Cobertura actual

| Input UI | Tabla/columna actual | Observaciones |
| --- | --- | --- |
| Nombre, fecha, nacionalidades, bio | `player_profiles.full_name`, `.birth_date`, `.nationality`, `.bio` | Columnas existentes, falta endpoint de actualización y normalizar códigos de país.【F:src/db/schema.sql†L1123-L1144】 |
| Altura, peso, perfil | `player_profiles.height_cm`, `.weight_kg`, `.foot` | Necesitan validaciones y unidades consistentes.【F:src/db/schema.sql†L1128-L1134】 |
| Residencia, idiomas, teléfono, documentos | `player_personal_details.residence_city`, `.residence_country_code`, `.languages`, `.phone`, `.document_*` | Tabla existe pero sin mutaciones expuestas; requerirá upsert y triggers para timestamps.【F:src/db/schema.sql†L1155-L1168】 |
| Trayectoria básica | `career_items` (`club`, `division`, fechas, `team_id`) | Falta soporte para roles, estadísticas por etapa y orden personalizado.【F:src/db/schema.sql†L1051-L1059】 |
| Multimedia (foto, video) | `player_media` (`type`, `url`, `title`, `is_primary`) | No hay columnas para visibilidad, usage tags ni moderación.【F:src/db/schema.sql†L1108-L1116】 |
| Estadísticas temporada | `stats_seasons` (`season`, `matches`, etc.) | Tabla existe pero UI aún no las consume.【F:src/db/schema.sql†L1319-L1332】 |
| Valor de mercado | `player_profiles.market_value_eur` | Falta campo para "expectativas" u objetivos mencionados en UI.【F:src/db/schema.sql†L1141-L1142】 |
| Datos combinados en dashboard | Vista `player_dashboard_state` | Ideal para hidratar formularios tras guardar.【F:src/db/schema.sql†L1190-L1247】 |

### 4.2 Brechas y ampliaciones propuestas

#### Datos personales
- Añadir `player_profiles.preferred_name` (alias) y `player_profiles.visibility` ya existe pero podría complementarse con `public_share_level` para controlar qué campos se muestran públicamente.
- Extender `player_personal_details` con `emergency_contact` (jsonb), `representation_agency` y timestamps `updated_at` mediante trigger `set_updated_at`.
- Crear `player_contact_preferences` (player_id, channel, enabled, notes) para manejar "Preferencias de contacto" y preparar RLS alineado a configuraciones futuras.

#### Datos futbolísticos
- Crear tabla `player_links` (id, player_id, type enum {transfermarkt, besoccer, highlight, instagram, linkedin, other}, url, title, is_primary, created_at) para normalizar enlaces externos. Permite validación por dominio y reuso en otras vistas.【F:docs/client-dashboard-roadmap.md†L35-L36】
- Extender `career_items` con campos `role`, `appearances`, `goals`, `assists`, `minutes`, `is_youth` y `order_index`. Evaluar tabla hija `career_item_stats` para múltiples métricas por competición.
- Implementar `player_contracts` (player_id, team_id, status enum {under_contract, free_agent, loan}, start_date, end_date, notes) para soportar "Situación contractual".
- Crear `player_honours` (id, player_id, title, competition, team, season, position, description, visibility) y relacionarlo con secciones de plantilla.【F:docs/client-dashboard-roadmap.md†L33-L36】
- Para "Objetivos de carrera", añadir `player_career_objectives` (player_id, goal, priority, target_date, visibility).

#### Multimedia y prensa
- Ampliar `player_media` con columnas: `visibility` (enum {public, private, link_only}), `usage_contexts` (text[]), `metadata` (jsonb para créditos/derechos), `needs_review` boolean, `review_status` enum y `processed_at` para flujos async.【F:docs/client-dashboard-roadmap.md†L38-L41】
- Crear `player_media_tags` (media_id, tag) o utilizar `usage_contexts` + `search_vectors` para filtrado.
- Tabla `player_press_mentions` (id, player_id, title, outlet, url, published_at, summary, image_url, visibility, order_index) para la sección "Notas de prensa y artículos".【F:src/app/(dashboard)/dashboard/edit-profile/multimedia/page.tsx†L144-L164】
- Para "Metadatos", agregar `player_media_collections` (id, player_id, name, description) y tabla pivote `player_media_collection_items` para agrupar activos.

#### Plantilla y publicación
- Crear `profile_theme_settings` (player_id PK, layout_id, primary_color, accent_color, typography, heading_scale, paragraph_spacing, updated_at) y `profile_sections_visibility` (id, player_id, section_id, enabled, order_index) alineado al roadmap.【F:docs/client-dashboard-roadmap.md†L43-L46】
- Considerar `profile_preview_snapshots` (player_id, template_version, generated_at, url) para cachear vistas previas.

### 4.3 Consideraciones adicionales
- Todas las tablas nuevas deben heredar RLS basada en `player_profiles.user_id` y permitir accesos admin.
- Reutilizar `profile_change_logs` para registrar cambios en nuevas entidades; agregar columna `entity`/`entity_id` para referencias cruzadas.
- Actualizar `player_dashboard_state` o crear vistas complementarias (ej. `player_dashboard_media_state`) para exponer nuevos conteos a métricas y badges.

## 5. Próximos pasos sugeridos
1. Definir contratos de API (mutations supabase) por sección y diseñar formularios con validaciones progresivas.
2. Priorizar migraciones de base de datos: `player_links`, `player_press_mentions`, `player_honours`, `player_contracts`, extensiones de `player_media` y `career_items`.
3. Implementar capa de servicios en el dashboard (`actions` server-side) que orqueste upserts y actualice `profile_change_logs`.
4. Diseñar componentes reutilizables para colecciones (listados con add/edit/delete) y mensajería de éxito; integrar `TaskCalloutList` para recalcular progreso tras cada guardado.
5. Documentar nuevas tablas y flujos en el roadmap para mantener alineado al equipo y facilitar posteriores iteraciones (V3 analytics, asistente, etc.).
