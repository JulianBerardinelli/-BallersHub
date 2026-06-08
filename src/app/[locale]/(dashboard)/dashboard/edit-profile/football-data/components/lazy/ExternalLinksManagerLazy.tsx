"use client";

import dynamic from "next/dynamic";
import SectionSkeleton from "./_skeleton";

const ExternalLinksManager = dynamic(
  () => import("../ExternalLinksManager"),
  {
    ssr: false,
    loading: () => <SectionSkeleton label="Enlaces externos" />,
  },
);

export default ExternalLinksManager;
