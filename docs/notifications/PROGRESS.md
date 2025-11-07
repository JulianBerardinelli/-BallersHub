# Historial de progreso del módulo de notificaciones

## 2025-11-07
- ✅ Se creó el módulo **Notification Center** con arquitectura modular en `src/modules/notifications`.
- ✅ Se definieron plantillas editables para onboarding, revisiones y anuncios generales.
- ✅ Se añadió persistencia local de descartes y sonido/animación al recibir nuevas cards.
- ✅ Se integró el proveedor global dentro de `app/providers.tsx`.
- ✅ Se documentó el flujo de uso en `USAGE.md` para facilitar futuras integraciones (incluida la sincronización con emails).

## 2025-11-08
- ✅ Onboarding y revisiones disparan automáticamente sus notificaciones al enviar solicitudes y al recibir resoluciones, evitando duplicados con almacenamiento local.

> Actualizá este archivo cada vez que expandas la funcionalidad del módulo o vincules nuevos eventos.
