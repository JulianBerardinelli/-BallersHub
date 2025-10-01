# Client dashboard delivery log

Este registro sigue la propuesta detallada en `docs/client-dashboard-v2-analysis.md` y el roadmap actualizado en
`docs/client-dashboard-roadmap.md`. Sirve para dejar constancia de los avances dentro del dashboard de jugadores y para
identificar los próximos pasos.

## ✅ Hecho en este entregable
- Normalizamos la configuración de publicación agregando tablas para `profile_theme_settings`, `profile_sections_visibility`,
  `player_links` y `player_honours`, además de extender `stats_seasons` con metadatos de competición y tarjetas disciplinarias.
- Creamos la vista `player_dashboard_publishing_state` para centralizar, en una sola consulta, el estado de publicación (links,
  secciones visibles, honores y estadísticas).
- Integramos la nueva vista en el dashboard: las páginas de "Datos futbolísticos" y "Estructura de la plantilla" ahora leen la
  configuración real del jugador, mostrando resúmenes dinámicos en lugar de placeholders estáticos.
- Documentamos los cambios de base de datos en `docs/db/client-dashboard-publishing-v2.sql` para facilitar su ejecución en
  Supabase.
- Desplegamos formularios interactivos para enlaces, palmarés y estadísticas usando React Hook Form + Zod, con acciones de
  Supabase que validan permisos, aplican RLS y revalidan la página tras cada alta, edición o eliminación.
- Diseñamos el plan funcional de la iteración v2 y versionamos el análisis en `docs/client-dashboard-v2-analysis.md` para
  alinear roadmap y entregables.
- Especificamos las tablas y políticas necesarias para solicitudes de trayectoria y vinculación de temporadas en
  `docs/db/client-dashboard-career-requests.sql`.
- Habilitamos la UI inicial de trayectoria dentro del dashboard, reutilizando el editor del onboarding y preparando la
  sincronización con solicitudes administrables.
- Ajustamos la gestión de trayectoria para que sólo pueda enviarse una solicitud al agregar nuevas etapas, incluyendo la
  designación de club actual que actualiza cierres anteriores y elimina estados de "jugador libre" redundantes.
- Refinamos la vinculación de palmarés y estadísticas con etapas concretas mostrando periodos abreviados, escudos y mejoras de
  legibilidad en las tablas y formularios.

## 🔜 Próximos pasos sugeridos
- Ejecutar los scripts de base de datos nuevos para habilitar `career_revision_requests` y los vínculos entre trayectoria y
  temporadas.
- Completar el flujo de persistencia desde el dashboard hacia las tablas de solicitudes, incluyendo estados de aprobación,
  cierres automáticos de etapas anteriores y revalidaciones automáticas.
- Extender el panel de administración con vistas dedicadas a las solicitudes de trayectoria provenientes del dashboard y el
  nuevo menú de gestión de perfiles.
- Conectar los toggles de `profile_sections_visibility` con persistencia real (mutations) y drag & drop para ordenar bloques de
  la plantilla pública.
- Incorporar vistas previas en vivo del perfil público utilizando Supabase Realtime y los ajustes guardados en
  `profile_theme_settings`.
- Integrar reglas de negocios para detectar secciones incompletas y alimentar el asistente/contextual tasks con los nuevos
  datos de publicación.

## 📌 Notas
- Recordar ejecutar el script `docs/db/client-dashboard-publishing-v2.sql` antes de desplegar para asegurar que las nuevas
  tablas y la vista estén disponibles.
- Mantener este archivo actualizado en cada iteración para acelerar la coordinación entre frontend, backend y producto.
