"use client";

import { useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";

import HeroJourney from "./HeroJourney";
import type { HeroGlobeData } from "./HeroJourney/data";

/**
 * Home wiring for the HeroJourney — the single seamless scrolljack that flows
 * from the globe hero into the VideoWall grid (the wall is rendered INSIDE the
 * journey, so we do NOT mount <HomeVideoWall> separately).
 *
 *  - Full-bleed breakout from the 1200px <main> via negative margin (NOT a
 *    transform — keeps the inner `position: sticky` working).
 *  - `-mt-[6.5rem]` cancels the layout's top padding so the hero starts at the
 *    very top, behind the transparent fixed header (which goes solid on scroll).
 *  - CTA → onboarding; respects prefers-reduced-motion (static hero + wall).
 *
 * The hero has NO black background of its own — it sits over the existing
 * SiteAmbient + the root radial background of the home.
 */
export default function HomeHeroJourney({ data }: { data?: HeroGlobeData }) {
  const router = useRouter();
  const prefersReduced = useReducedMotion();

  return (
    <div className="relative ml-[calc(50%-50vw)] w-screen -mt-[6.5rem]">
      <HeroJourney
        tweaks={{ accent: "#CCFF00", reduceMotion: !!prefersReduced }}
        onCta={() => router.push("/onboarding/start")}
        data={data}
      />
    </div>
  );
}
