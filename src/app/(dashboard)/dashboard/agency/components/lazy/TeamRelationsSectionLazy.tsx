"use client";

import dynamic from "next/dynamic";
import SectionSkeleton from "./_skeleton";

// Heaviest below-fold section (~555 lines). Single biggest chunk
// removed from initial bundle on /dashboard/agency.
const TeamRelationsSection = dynamic(
  () => import("../TeamRelationsSection"),
  {
    ssr: false,
    loading: () => <SectionSkeleton label="Relación con equipos" />,
  },
);

export default TeamRelationsSection;
