"use client";

import dynamic from "next/dynamic";
import SectionSkeleton from "./_skeleton";

const AgencyMediaManagerClient = dynamic(
  () => import("../AgencyMediaManagerClient"),
  { ssr: false, loading: () => <SectionSkeleton labelKey="media" /> },
);

export default AgencyMediaManagerClient;
