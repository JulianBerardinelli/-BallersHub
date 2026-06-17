"use client";

// Copied from the player Pro portfolio (`[slug]/components/SmoothScrollProvider`).
// Audience-agnostic Lenis root — low lerp for the cinematic, heavy deceleration
// the scroll-jacked sections depend on.

import { ReactLenis } from "lenis/react";
import { ReactNode } from "react";

export default function SmoothScrollProvider({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={{ lerp: 0.08, duration: 1.5, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
