"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import SectionSkeleton from "./_skeleton";

function ScoutingAnalysisSkeleton() {
  const t = useTranslations("dashEditProfile");
  return <SectionSkeleton label={t("footballData.lazy.scouting")} />;
}

const ScoutingAnalysisSection = dynamic(
  () => import("../ScoutingAnalysisSection"),
  {
    ssr: false,
    loading: () => <ScoutingAnalysisSkeleton />,
  },
);

export default ScoutingAnalysisSection;
