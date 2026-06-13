"use client";

import dynamic from "next/dynamic";
import SectionSkeleton from "./_skeleton";

const CountriesSection = dynamic(
  () => import("../CountriesSection"),
  { ssr: false, loading: () => <SectionSkeleton labelKey="countries" /> },
);

export default CountriesSection;
