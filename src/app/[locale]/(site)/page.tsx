// app/(site)/page.tsx

import type { Metadata } from "next";
import { HomeDashJourney, HomeHeroJourney, HomePricing } from "@/components/site/home";
import { buildHeroGlobeData } from "@/components/site/home/HeroJourney/buildGlobeData";
import { getScoutingPlayers } from "@/lib/scouting/data";
import { localizedAlternates } from "@/lib/seo/hreflang";
import type { Locale } from "@/i18n/routing";

// Hourly ISR — the hero globe shows the real, indexable scouting players (same
// set + cadence as /players); new approved profiles surface within the hour.
export const revalidate = 3600;

// The home inherits title/description/openGraph from the [locale] root layout,
// but the layout can't set a self-referential canonical (it has no per-page
// path). Set it here. IMPORTANT: return ONLY `alternates` — adding an
// `openGraph` key would replace the inherited one and drop the
// `[locale]/opengraph-image.tsx` card (Next 15 merge semantics).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: localizedAlternates(locale as Locale, "/") };
}

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
