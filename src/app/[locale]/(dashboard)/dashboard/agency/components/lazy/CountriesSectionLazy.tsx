"use client";

import dynamic from "next/dynamic";
import SectionSkeleton from "./_skeleton";

const CountriesSection = dynamic(
  () => import("../CountriesSection"),
  { ssr: false, loading: () => <SectionSkeleton label="Países" /> },
);

export default CountriesSection;
