# Dashboard Football Data Module

## Objetivo
Extender `dashboard/edit-profile/football-data` con flujos de edición reutilizables para los módulos "Perfil deportivo" y "Valor de mercado y proyección", manteniendo la UI existente y registrando cambios críticos en la base de datos.

## Alcance de esta iteración
- Encapsular ambos módulos en componentes cliente (`SportProfileSection`, `MarketProjectionSection`) con controles de edición, guardado y cancelación consistentes.
- Bloquear los campos inmutables (posiciones principales y club actual) mientras se habilita la edición de `foot`, `contract_status`, `market_value_eur` y `career_objectives`.
- Implementar acciones de servidor (`updateSportProfile`, `updateMarketProjection`) que validan, normalizan y persisten cambios en `player_profiles`, registrando auditorías en `profile_change_logs`.
- Formatear automáticamente el valor de mercado utilizando `Intl.NumberFormat` y mostrar feedback contextual con HeroUI.
- Añadir documentación y columnas nuevas (`contract_status`, `career_objectives`) al esquema para que otros módulos puedan reutilizar la información.
- Documentar los scripts SQL necesarios para Supabase en `supabase-snippets.sql` y facilitar su ejecución manual cuando sea requerido.

## Decisiones clave
- Se añadieron las columnas `contract_status` y `career_objectives` en `player_profiles`, además de exponerlas en la vista `player_dashboard_state` para hidratar el dashboard sin consultas adicionales.
- Los formularios cliente reutilizan `SectionCard` y un botón de lápiz en el header para mantener la estética existente y ofrecer una experiencia coherente con `personal-data`.
- Los valores editables se normalizan (trim, validaciones de longitud, parseo de montos) antes de persistir, evitando datos ruidosos.
- Cada actualización registra una entrada en `profile_change_logs`, preparando la futura integración con notificaciones y workflows de revisión.
- Se reutiliza `react-hook-form` para centralizar el estado del formulario y limpiar errores al alternar entre vista y edición.

## Próximos pasos sugeridos
- Integrar selectores específicos para posiciones y clubes utilizando catálogos relacionales cuando estén disponibles.
- Sincronizar el valor de mercado con fuentes externas (Transfermarkt, BeSoccer) aprovechando los enlaces gestionados en el mismo módulo.
- Unificar la notificación de cambios guardados mediante el módulo de notificaciones global del dashboard.
- Automatizar estas sentencias SQL dentro del pipeline de despliegue para que los ambientes compartan la misma estructura.
