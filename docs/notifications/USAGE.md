# Centro de notificaciones de BallersHub

Este módulo provee un **Notification Center** modular basado en HeroUI que renderiza cards animadas en la esquina inferior derecha de la aplicación.

## Componentes clave
- `NotificationProvider` (`src/modules/notifications/NotificationProvider.tsx`): gestiona el estado, animaciones, audio y persistencia de descartes.
- `NotificationCenter` (`src/modules/notifications/components/NotificationCenter.tsx`): contenedor fijo que muestra las cards.
- `notificationTemplates` (`src/modules/notifications/messages.ts`): catálogo centralizado y editable de textos.
- Builders (`src/modules/notifications/builders.ts`): funciones helper para disparar eventos comunes de onboarding, revisiones y anuncios.

> ⚙️ El proveedor ya está integrado en `app/providers.tsx`, por lo que el centro está disponible en toda la app sin dependencias adicionales.

## Cómo disparar una notificación
```tsx
"use client";
import { useNotificationCenter, onboardingNotification } from "@/modules/notifications";

export function ExampleComponent({ userName }: { userName: string }) {
  const { enqueue } = useNotificationCenter();

  const handleClick = () => {
    enqueue(
      onboardingNotification.submitted({
        userName,
        requestId: "REQ-2024-001",
      }),
    );
  };

  return <button onClick={handleClick}>Enviar onboarding</button>;
}
```

- Las notificaciones se deduplican por `id`. Podés pasar un `id` explícito para sincronizar con el backend.
- Los descartes se guardan en `localStorage` (`ballershub.notifications.dismissed`). Si el usuario cierra una card, no se volverá a mostrar tras recargar.
- Para reiniciar descartes (por ejemplo, desde un panel de usuario) llamá a `resetDismissed()` del hook.

## Personalizar textos
Editá `src/modules/notifications/messages.ts`. Cada plantilla define:
- `headline`: título (puede interpolar `userName`, `topicLabel`, etc.).
- `body`: contenido principal.
- `details`: texto adicional que aparece al expandir.
- `cta`: botón de acción con label y URL.
- `tone`: controla colores/iconografía de la card (`info`, `success`, `warning`, `danger`).

Los mensajes aceptan interpolaciones y emojis. Usá los helpers existentes o agregá nuevos templates siguiendo el mismo patrón.

## Agregar nuevos eventos
1. Definí el template en `messages.ts` y sumalo a `NotificationTemplateKey`.
2. (Opcional) Creá un builder en `builders.ts` para simplificar su consumo.
3. Desde el código de negocio, llamá a `enqueue` con el builder correspondiente.
4. Actualizá `PROGRESS.md` para dejar registro del cambio.

## Vinculación futura con emails
El provider incluye `TODO` implícito para sincronizar con notificaciones por correo. Cuando se implemente un disparador de emails:
- Reutilizá el mismo `id` que se envía al backend para evitar duplicados.
- Encapsulá la lógica en un servicio (ej. `src/modules/notifications/channels/email.ts`) para mantener la modularidad.

## Diseño
- Cards compactas con sombras suaves y animaciones `framer-motion`.
- Avatar de “BallersHub Admin” con badge verificado (`src/components/icons/VerifiedBadge.tsx`).
- Botón sutil de cierre y CTA plano de HeroUI.
- Animación y sonido sutil al aparecer (`utils/sound.ts`).

¡Listo! Con estas guías podés extender el módulo sin tocar otras lógicas del proyecto.
