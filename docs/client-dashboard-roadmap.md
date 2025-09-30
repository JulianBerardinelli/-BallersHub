# Client dashboard delivery plan

## Versioning strategy
- **V0 (Scaffold)** – UI shell, navigation, and placeholder copy (completado).
- **V1 (Player onboarding sync)** – Datos personales + estado de solicitud alineados con Supabase.
- **V2 (Profile publishing)** – Gestión integral de perfil, multimedia y plantilla para generar el CV público.
- **V3 (Account growth & insights)** – Herramientas de suscripción, métricas y acompañamiento.

## Cross-cutting foundations
- [x] Consolidar un `DashboardDataProvider` que recupere `user`, `player_profile`, `player_applications`, `subscriptions` y `plan_features` usando Supabase RPC / vistas materializadas.
- [x] Definir utilidades de autorización (`canEditProfile`, `canEditTemplate`, `hasActiveApplication`, `isProPlan`, etc.) basadas en `role`, `player_status` y `plan`.
- [ ] Instrumentar estados vacíos y loaders unificados (HeroUI `Skeleton`, `EmptyState`) para cada sección.
- [ ] Preparar esquema de analytics/eventos (ej. `dashboard.task_completed`) para medir adopción.

## V1 · Player onboarding sync
### Estado general (dashboard/page.tsx)
- [x] Mostrar tarjeta resumen con estado del perfil (`player_status`) y aplicación activa (`player_applications.status`).
- [x] Habilitar badges de progreso por sección calculando campos obligatorios completados (datos personales, trayectoria, multimedia mínima).
- [x] Incorporar CTA contextual: crear solicitud si no existe, ver solicitud si está en revisión, ir a perfil público si está aprobado.

### Editar perfil · Datos personales (`edit-profile/personal-data`)
- [x] Mapear campos de `player_profiles` y `player_personal_details` (nombre, documento, fecha de nacimiento, altura, peso, idiomas).
- [x] Sincronizar dirección/país utilizando catálogo `countries` y helper `trg_set_country_code_from_text` del schema.
- [x] Gestionar avatar en Supabase Storage (`player_media` con `media_type = 'photo'` y flag `is_primary`).
- [x] Registrar historial de cambios críticos (auditoría mínima con tabla `profile_change_logs`).

### Solicitud y permisos
- [x] Crear vista combinada `player_dashboard_state` que una `profiles`, `player_applications`, `plan_subscriptions` para hidratar el dashboard en una llamada.
- [x] Bloquear secciones `edit-profile/*` y `edit-template/*` cuando `player_status` ∈ {`draft`, `pending_review`} mostrando componente de desbloqueo.
- [x] Permitir reabrir onboarding si la solicitud fue rechazada (`player_applications.status = 'rejected'`).

## V2 · Profile publishing
### Datos futbolísticos (`edit-profile/football-data`)
- [ ] Construir CRUD para `career_items` con reordenamiento y sincronización de `teams` (respetar triggers de integridad).
- [ ] Gestionar vínculos externos (`player_links` tabla derivada) validando dominios permitidos.
- [ ] Capturar logros (`player_honours`) y estadísticas (`stats_seasons`) con filtros por temporada/competición.

### Multimedia (`edit-profile/multimedia`)
- [ ] Integrar uploader para `player_media` (fotos, videos, docs) con procesamiento asíncrono y estados `visibility`.
- [ ] Etiquetar contenidos por tipo de uso (perfil público, prensa, CV) con metadata JSONB.
- [ ] Implementar moderación interna (flags `needs_review`, `review_status`).

### Editor de plantilla (`edit-template/*`)
- [ ] Persistir selección de layout y colores en `profile_theme_settings` (nueva tabla normalizada por `player_id`).
- [ ] Configurar toggles para activar bloques (`show_highlights`, `show_press`, etc.) guardados en `profile_sections_visibility`.
- [ ] Generar vista previa con `public/[slug]` embebido y señales en tiempo real (posiblemente usando Supabase Realtime).

## V3 · Account growth & insights
### Configuración de cuenta (`settings/account`)
- [ ] Permitir actualización de correo/contraseña via Supabase Auth y registro de sesiones activas (`auth.sessions`).
- [ ] Añadir preferencias de notificación (`user_notification_settings`) con granularidad por canal.
- [ ] Gestionar integraciones sociales (OAuth) y 2FA.

### Suscripción (`settings/subscription`)
- [ ] Conectar con Stripe Billing (checkout, portal, webhooks) y sincronizar `plan_subscriptions`.
- [ ] Mostrar histórico de facturación (`invoices`) y estado de pago (`payment_intents`).
- [ ] Habilitar upgrades/downgrades condicionales según `plan_features` y límites de contenido.

### Experiencia asistida
- [ ] Crear "assistant" contextual que guíe tareas pendientes (helper component que consume backlog de `dashboard_tasks`).
- [ ] Implementar centro de soporte (FAQ dinámica + enlace a ticketing) gestionado desde `support_articles`.
- [ ] Añadir métricas de rendimiento del perfil (visitas, compartidos) consumiendo `profile_views` y `share_events`.

## Referencias de base de datos
- `src/db/schema.sql` contiene la definición actualizada de perfiles, aplicaciones, multimedia y sus relaciones.
- `schema.sql` en la raíz incorpora funciones administrativas (aprobación de equipos) relevantes para sincronizar clubes.
- Revisar políticas RLS y triggers (`player_profiles_cud`, `trg_set_country_code_from_text`) antes de exponer mutaciones desde el dashboard.
