# Roadmap módulo dashboard del cliente

## Alcance actual
- Se implementó la estructura UI base para todas las secciones solicitadas (perfil, plantilla y configuración).
- Navegación lateral modular alimentada por `navigation.ts`, lista para condicionar items según roles o planes.
- Layout general unificado con resumen de sesión, estado del perfil y badges para visibilidad/plan.
- Páginas individuales con componentes reutilizables (`PageHeader`, `SectionCard`, `FormField`, `Sidebar`).
- Contenido placeholder que describe futuras funcionalidades sin lógica de negocio asociada.

## Próximos desarrollos (priorizados)

### Autenticación y contexto de datos
- [ ] Crear un contexto/servicio que exponga `user`, `playerProfile`, `subscription` y flags de permisos para evitar múltiples fetch en cada página.
- [ ] Definir guards para rutas según tipo de cuenta (jugador aprobado, en revisión, sin perfil, staff, etc.).
- [ ] Implementar feedback visual/redirects cuando falten datos críticos (ej: perfil borrador) aprovechando la navegación modular.

### Edición de perfil
- [ ] Conectar formularios con Supabase/Drizzle y manejar validaciones (`react-hook-form` + `zod`).
- [ ] Sincronizar datos personales con onboarding step 1 (formato de fechas, nacionalidades, documentos, idiomas).
- [ ] Definir almacenamiento seguro de teléfono/redes sociales y parámetros de visibilidad pública.
- [ ] Integrar subida/transformación de avatar con crop y preview en vivo.

### Datos futbolísticos
- [ ] Construir CRUD de trayectoria (tabla `career_items` + nuevos endpoints) con drag & drop y validaciones de solapamiento.
- [ ] Gestionar links externos (Transfermarkt, BeSoccer, redes) con normalización y previews.
- [ ] Agregar soporte para estados contractuales, agente actual y valor de mercado con reglas por plan.
- [ ] Incorporar palmarés y estadísticas dinámicas (posible tabla dedicada + endpoints).

### Multimedia
- [ ] Integrar almacenamiento de fotos/videos en Supabase Storage con categorías, metadatos y estados de publicación.
- [ ] Añadir generador de thumbnails y conversión a resoluciones optimizadas.
- [ ] Conectar feeds de prensa/noticias (API interna o scraping autorizado) y permitir curación manual.
- [ ] Implementar controles de derechos de uso y expiración de contenidos.

### Editor de plantilla
- [ ] Persistir selección de estilos/colores por jugador y reflejarla en la página pública.
- [ ] Desarrollar switchers interactivos (toggle, drag & drop) con feedback inmediato.
- [ ] Configurar reglas condicionales (mostrar/ocultar bloques según existencia de datos o plan) reutilizando la config de navegación.
- [ ] Preparar render de vista previa en vivo (iframe/preview component) integrado con generador de CV.

### Configuración de cuenta y suscripción
- [ ] Habilitar actualización de email/contraseña y conexión con OAuth providers.
- [ ] Construir centro de notificaciones (elección de canales, frecuencia, plantillas de correo).
- [ ] Integrar Supabase Auth para listado/cierre de sesiones activas.
- [ ] Conectar con Stripe para gestionar upgrades, cancelaciones, reintentos de cobro y emisión de comprobantes.

### Experiencia y soporte
- [ ] Añadir breadcrumbs y estados vacíos contextualizados para cada sección.
- [ ] Crear sistema de toasts/modales para confirmar acciones críticas (cancelación de plan, cambio de plantilla, etc.).
- [ ] Diseñar métricas y tracking (Amplitude/Mixpanel) para entender uso del dashboard.
- [ ] Preparar documentación para desarrolladores sobre cómo extender el menú y reutilizar componentes.

## Consideraciones técnicas
- Centralizar constantes (presets, estructura de secciones) en archivos compartidos para evitar duplicidad.
- Mantener componentes desacoplados (server vs client) para optimizar performance en Next.js 15/React 19.
- Planificar pruebas unitarias/e2e una vez que se agregue lógica (formularios, mutaciones, condicionales).
- Documentar contratos de API antes de implementar mutaciones para alinear frontend y backend.
