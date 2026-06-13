"use client";

import dynamic from "next/dynamic";
import SectionSkeleton from "./_skeleton";

const ServicesSection = dynamic(
  () => import("../ServicesSection"),
  { ssr: false, loading: () => <SectionSkeleton labelKey="services" /> },
);

export default ServicesSection;
