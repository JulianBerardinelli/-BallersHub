"use client";

import dynamic from "next/dynamic";
import SectionSkeleton from "./_skeleton";

const ServicesSection = dynamic(
  () => import("../ServicesSection"),
  { ssr: false, loading: () => <SectionSkeleton label="Servicios" /> },
);

export default ServicesSection;
