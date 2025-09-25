# Client dashboard task priorities

Esta guía describe cómo clasificamos las tareas del cliente según su impacto en la publicación del perfil profesional. La
priorización alimenta los badges de navegación, el bloque de “Próximos pasos” y los indicadores de progreso de cada sección.

## Niveles de severidad

| Severidad   | Color HeroUI | Uso principal                                   |
| ----------- | ------------ | ----------------------------------------------- |
| `danger`    | `danger`     | Datos imprescindibles para habilitar el perfil. |
| `warning`   | `warning`    | Contenido prioritario para la revisión.         |
| `secondary` | `secondary`  | Recomendaciones y mejoras continuas.            |

> Cada nivel se define en `src/lib/dashboard/client/tasks.ts`, lo que permite ajustar la prioridad sin tocar la UI.

## Mapeo por módulo

### Datos personales (`/dashboard/edit-profile/personal-data`)

| Severidad | Tarea                                    | Origen en la base de datos                                 |
| --------- | ---------------------------------------- | ---------------------------------------------------------- |
| danger    | Cargar nombre completo                   | `player_profiles.full_name`                                |
| danger    | Registrar fecha de nacimiento            | `player_profiles.birth_date`                               |
| danger    | Definir nacionalidad                     | `player_profiles.nationality`                              |
| danger    | Seleccionar posiciones                   | `player_profiles.positions`                                |
| danger    | Subir foto de perfil                     | `player_profiles.avatar_url` (distinta al placeholder)     |
| warning   | Completar biografía                      | `player_profiles.bio`                                      |
| warning   | Informar club actual o condición de libre| `player_profiles.current_club`                             |
| secondary | Registrar altura, peso y pierna hábil    | `player_profiles.height_cm`, `player_profiles.weight_kg`, `player_profiles.foot` |

### Datos futbolísticos (`/dashboard/edit-profile/football-data`)

| Severidad | Tarea                          | Origen en la base de datos                            |
| --------- | ------------------------------ | ----------------------------------------------------- |
| danger    | Registrar trayectoria mínima   | Conteo en `career_items` por `player_id`              |
| secondary | Ampliar información táctica    | `player_profiles.positions` (más de una posición)     |

### Multimedia (`/dashboard/edit-profile/multimedia`)

| Severidad | Tarea                          | Origen en la base de datos                            |
| --------- | ------------------------------ | ----------------------------------------------------- |
| danger    | Agregar al menos una foto      | Conteo en `player_media` filtrado por `type = 'photo'`|
| warning   | Incorporar video destacado     | Conteo en `player_media` filtrado por `type = 'video'`|
| secondary | Completar galería multimedia   | Conteo total en `player_media` (objetivo ≥ 5 ítems)   |

## Futuras extensiones

* **Referencias y datos de contacto**: cuando se incorpore la tabla de contactos/referencias del jugador, basta con exponer el
  conteo dentro de `PlayerTaskMetrics.contactReferences` y añadir una regla `danger` en `tasks.ts`.
* **Estilos y estructura de plantilla**: podremos sumar reglas `warning` o `secondary` ligadas a configuraciones en las tablas
  de plantillas sin modificar la UI.
* **Contenido premium**: nuevas reglas podrán condicionar badges y recomendaciones dependiendo del plan (`subscriptions`).

## Cómo extender la matriz

1. **Agregar la métrica**: exponer el dato en `fetchPlayerTaskMetrics` o dentro del objeto `profile` utilizado por el contexto.
2. **Definir la tarea**: sumar una entrada en `TASK_DEFINITIONS` con `sectionId`, severidad y verificación (`check`).
3. **Actualizar la documentación**: registrar la nueva regla en esta tabla para mantener alineado al equipo.

Con esta estructura, la priorización permanece centralizada y se refleja automáticamente en la navegación, los badges y los
componentes del dashboard.
