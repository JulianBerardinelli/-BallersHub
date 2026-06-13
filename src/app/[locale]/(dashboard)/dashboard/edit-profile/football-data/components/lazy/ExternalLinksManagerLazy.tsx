"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import SectionSkeleton from "./_skeleton";

function ExternalLinksSkeleton() {
  const t = useTranslations("dashEditProfile");
  return <SectionSkeleton label={t("footballData.lazy.externalLinks")} />;
}

const ExternalLinksManager = dynamic(
  () => import("../ExternalLinksManager"),
  {
    ssr: false,
    loading: () => <ExternalLinksSkeleton />,
  },
);

export default ExternalLinksManager;
