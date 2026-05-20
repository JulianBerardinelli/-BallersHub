"use client";

import dynamic from "next/dynamic";
import SectionSkeleton from "./_skeleton";

const ScoutingAnalysisSection = dynamic(
  () => import("../ScoutingAnalysisSection"),
  {
    ssr: false,
    loading: () => <SectionSkeleton label="Análisis de scouting" />,
  },
);

export default ScoutingAnalysisSection;
