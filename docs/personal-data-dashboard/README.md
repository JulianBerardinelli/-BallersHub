# Dashboard Personal Data Module

## Objetivo
Implementar la edición completa de los módulos "Información básica" y "Datos de contacto" dentro de `dashboard/edit-profile/personal-data`, manteniendo la UI actual y preparando la lógica para reutilizarla en otros apartados del dashboard.

## Alcance del sprint actual
- Añadir componentes editables reutilizables con controles de estado (activar edición, guardar, cancelar) y feedback contextual.
- Conectar los formularios con acciones de servidor que actualizan `player_profiles`, `player_personal_details` y el email de usuario en Supabase cuando corresponde.
- Registrar cambios relevantes en `profile_change_logs` para auditoría.
- Mantener el diseño existente utilizando `SectionCard` y HeroUI para las interacciones.

## Decisiones clave
- Se extendió `SectionCard` para soportar un área de acciones, permitiendo colocar el botón de edición junto al título sin duplicar estilos.
- Los formularios se encapsularon en componentes cliente (`BasicInformationSection` y `ContactInformationSection`) para aislar la lógica de estado y facilitar su reutilización en secciones futuras.
- Las acciones de servidor normalizan y validan los datos (formato de fechas, números, países, etc.) utilizando la tabla `countries` como referencia para obtener códigos ISO y etiquetas.
- Se registran todos los cambios significativos en `profile_change_logs`, asegurando trazabilidad.
- El email se actualiza mediante `supabase.auth.updateUser`, sólo cuando el valor cambia y supera validaciones básicas.
- Los campos bloqueados (nombre completo y nacionalidades) permanecen sólo lectura en el cliente y se resguardan en el servidor, garantizando consistencia en todo el dashboard.
- Las fechas y métricas numéricas se normalizan al hidratar la UI para que los inputs muestren los valores actuales provenientes de la base de datos.

## Próximos pasos sugeridos
- Implementar selectores específicos (autocomplete) para países y nacionalidades, reutilizando el lookup que ya construyen las acciones.
- Extender el patrón de secciones editables al resto de pestañas del dashboard (perfil deportivo, mercado, metadatos).
- Añadir tests de integración sobre las acciones para validar las reglas de normalización y los logs generados.
