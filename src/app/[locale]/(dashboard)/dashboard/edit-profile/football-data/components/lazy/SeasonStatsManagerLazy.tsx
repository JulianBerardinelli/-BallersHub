"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import SectionSkeleton from "./_skeleton";

function SeasonStatsSkeleton() {
  const t = useTranslations("dashEditProfile");
  return <SectionSkeleton label={t("footballData.lazy.seasonStats")} />;
}

// Client-only wrapper so we can use `ssr: false`. The underlying
// SeasonStatsManager is ~800 lines of HeroUI form/table state — by
// far the heaviest below-the-fold component on this page. Hidden
// from SSR + initial hydration; loads when the user actually scrolls
// to it (or instantly on intersection, since we mount it normally
// inline — there's no IntersectionObserver gate).
const SeasonStatsManager = dynamic(
  () => import("../SeasonStatsManager"),
  {
    ssr: false,
    loading: () => <SeasonStatsSkeleton />,
  },
);

export default SeasonStatsManager;
