"use client";

import dynamic from "next/dynamic";
import SectionSkeleton from "./_skeleton";

const MarketProjectionSection = dynamic(
  () => import("../MarketProjectionSection"),
  {
    ssr: false,
    loading: () => <SectionSkeleton label="Proyección de mercado" />,
  },
);

export default MarketProjectionSection;
