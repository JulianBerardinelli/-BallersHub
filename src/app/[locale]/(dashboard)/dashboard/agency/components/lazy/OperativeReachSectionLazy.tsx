"use client";

import dynamic from "next/dynamic";
import SectionSkeleton from "./_skeleton";

const OperativeReachSection = dynamic(
  () => import("../OperativeReachSection"),
  { ssr: false, loading: () => <SectionSkeleton label="Alcance operativo" /> },
);

export default OperativeReachSection;
