"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import SectionSkeleton from "./_skeleton";

function HonoursSkeleton() {
  const t = useTranslations("dashEditProfile");
  return <SectionSkeleton label={t("footballData.lazy.honours")} />;
}

const HonoursManager = dynamic(
  () => import("../HonoursManager"),
  {
    ssr: false,
    loading: () => <HonoursSkeleton />,
  },
);

export default HonoursManager;
