"use client";

import { ReactLenis } from 'lenis/react';
import { ReactNode } from "react";

export default function SmoothScrollProvider({ children }: { children: ReactNode }) {
  // Configuración de Lenis: lerp bajo hace que la interpolación sea más pesada y cinemática
  // duration controla qué tan largo es el decelere.
  return (
    <ReactLenis root options={{ lerp: 0.08, duration: 1.5, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
