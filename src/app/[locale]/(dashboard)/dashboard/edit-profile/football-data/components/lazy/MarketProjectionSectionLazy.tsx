"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import SectionSkeleton from "./_skeleton";

function MarketProjectionSkeleton() {
  const t = useTranslations("dashEditProfile");
  return <SectionSkeleton label={t("footballData.lazy.market")} />;
}

const MarketProjectionSection = dynamic(
  () => import("../MarketProjectionSection"),
  {
    ssr: false,
    loading: () => <MarketProjectionSkeleton />,
  },
);

export default MarketProjectionSection;
