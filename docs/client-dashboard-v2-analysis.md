# Client dashboard v2 — análisis funcional

Este documento sintetiza los objetivos de la segunda iteración del dashboard de jugadores. Amplía el roadmap (`docs/client-dashboard-roadmap.md`) con decisiones tácticas para el desarrollo.

## Contexto
- La versión actual del dashboard ya permite gestionar enlaces externos, palmarés y estadísticas mediante formularios con validaciones server-side.
- Todavía dependemos del flujo de onboarding para capturar trayectoria detallada y proponer equipos nuevos.
- Los administradores cuentan con un panel unificado de solicitudes (aplicaciones, equipos y trayectorias provenientes del onboarding).

## Objetivos prioritarios
1. **Trayectoria autoservicio**
   - Replicar en el dashboard la experiencia de edición de `career_items` disponible en onboarding.
   - Permitir reordenamiento automático por fechas y edición granular de cada etapa.
   - Exponer la misma UX de búsqueda de equipos con sugerencias y opción de “proponer equipo”.
   - Registrar solicitudes de cambios en tablas dedicadas para revisión del equipo de administración.
2. **Vincular temporadas con logros y estadísticas**
   - Asociar cada registro de `player_honours` y `stats_seasons` a una etapa concreta de la trayectoria.
   - Reutilizar la selección de temporadas tanto en palmarés como en estadísticas para evitar inconsistencias.
3. **Reorganizar el panel de administración**
   - Separar el inbox de solicitudes (aplicaciones, trayectorias, equipos propuestos) de la gestión de jugadores existentes.
   - Preparar un espacio dedicado a revisiones de perfil y cambios solicitados desde el dashboard.

## Alcance técnico
- Nuevas tablas para solicitudes de actualización de trayectoria y equipos propuestos por jugadores activos.
- Alteraciones a `player_honours` y `stats_seasons` para enlazar con `career_items`.
- Vistas consolidadoras para exponer, en una única consulta, la trayectoria publicada junto a las solicitudes pendientes.
- Hooks de Supabase Actions que validen permisos, creen las solicitudes y revaliden las rutas afectadas.
- Componentes compartidos (TeamPickerCombo, CareerEditor) adaptados al dashboard.

## Entregables esperados
- Scripts SQL versionados en `docs/db/` para ejecutar sobre Supabase.
- Componentes de React con estados controlados y validaciones mediante Zod.
- Acciones server-side que encapsulen la lógica de negocio y revalidación.
- Actualizaciones del panel de administración para visualizar solicitudes provenientes del dashboard.

## Métricas de éxito
- Jugadores pueden cargar, editar o proponer etapas de trayectoria sin depender del onboarding.
- Los logros y estadísticas quedan vinculados a temporadas válidas según la trayectoria.
- Administradores pueden revisar solicitudes con contexto suficiente y sin mezclar flujos de alta de jugadores nuevos.
