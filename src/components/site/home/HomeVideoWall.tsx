"use client";

import { useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";

import VideoWall from "./VideoWall";

/**
 * Home wiring for the scrolljacking VideoWall:
 *  - Breaks out of the 1200px <main> container so the wall is truly full-bleed
 *    (100vw). Uses a negative-margin technique — NOT a transform — so the
 *    component's `position: sticky` scrolljacking keeps working.
 *  - Routes the "Crear portfolio web" CTA to the signup/onboarding flow.
 *  - Respects prefers-reduced-motion → renders the accessible static layout.
 */
export default function HomeVideoWall() {
  const router = useRouter();
  const prefersReduced = useReducedMotion();

  return (
    <div className="relative ml-[calc(50%-50vw)] w-screen">
      <VideoWall
        accent="#CCFF00"
        reduceMotion={!!prefersReduced}
        onCta={() => router.push("/onboarding/start")}
      />
    </div>
  );
}
