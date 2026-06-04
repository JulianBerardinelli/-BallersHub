"use client";

import { useEffect } from "react";

/**
 * Reinstala la intención "sin zoom" que ya declara el viewport meta
 * (app/layout.tsx: `maximumScale: 1` / `userScalable: false`) en la única
 * plataforma que lo ignora: iOS Safari, que desde iOS 10 siempre habilita el
 * pinch-zoom por accesibilidad sin importar el meta tag.
 *
 * Cancelamos los eventos `gesture*` de WebKit (el mecanismo de pinch de
 * Safari) — no-op en Android/Chrome, que ya respetan el meta. El doble-tap
 * para zoom lo cubre `touch-action: manipulation` en globals.css.
 *
 * Montado solo en las portfolios públicas inmersivas (`(public)/layout.tsx`)
 * para no interferir con el pinch/pan propio del globo de scouting ni con el
 * zoom de accesibilidad en el resto de la app.
 */
export default function ZoomLock() {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    // Eventos pinch propietarios de WebKit. Tipados como `string` (no están en
    // los event maps estándar del DOM), lo que usa el overload genérico de
    // addEventListener sin error de TS.
    const events = ["gesturestart", "gesturechange", "gestureend"];
    for (const evt of events) {
      document.addEventListener(evt, prevent, { passive: false });
    }
    return () => {
      for (const evt of events) document.removeEventListener(evt, prevent);
    };
  }, []);

  return null;
}
