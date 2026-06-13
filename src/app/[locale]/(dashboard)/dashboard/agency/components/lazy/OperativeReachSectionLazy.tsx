"use client";

import dynamic from "next/dynamic";
import SectionSkeleton from "./_skeleton";

const OperativeReachSection = dynamic(
  () => import("../OperativeReachSection"),
  { ssr: false, loading: () => <SectionSkeleton labelKey="reach" /> },
);

export default OperativeReachSection;
