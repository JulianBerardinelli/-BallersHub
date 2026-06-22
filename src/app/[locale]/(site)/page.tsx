// app/(site)/page.tsx

import { HomeDashJourney, HomeHeroJourney, HomePricing } from "@/components/site/home";
import { buildHeroGlobeData } from "@/components/site/home/HeroJourney/buildGlobeData";
import { getScoutingPlayers } from "@/lib/scouting/data";

// Hourly ISR — the hero globe shows the real, indexable scouting players (same
// set + cadence as /players); new approved profiles surface within the hour.
export const revalidate = 3600;

export default async function Home() {
  // Real talent on the hero globe; fall back to the mock payload if the scouting
  // data has no geo yet, or on a DB hiccup, so the hero never looks empty.
  const players = await getScoutingPlayers().catch((err) => {
    console.error("[home] failed to load scouting players for the globe:", err);
    return [];
  });
  const globeData = buildHeroGlobeData(players) ?? undefined;

  return (
    <div className="space-y-24 pb-12">
      {/*
        Hero globe → dive into Argentina → bloom → VideoWall grid: ONE continuous
        scrolljack (Claude Design handoff). The video wall is rendered inside the
        journey, so it is not mounted separately here.
      */}
      <HomeHeroJourney data={globeData} />
      {/*
        Product tour: liquid-wave scrolljack — Producto → Dashboard → Agente
        (device mocks + interactive cards). Flows directly out of the videowall.
      */}
      <HomeDashJourney />
      {/* Pricing plans right below the product tour — same UI as /pricing.
          The home ends here: nothing after the plan comparison table. */}
      <HomePricing />
    </div>
  );
}
