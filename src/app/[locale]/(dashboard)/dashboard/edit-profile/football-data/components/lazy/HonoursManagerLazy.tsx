"use client";

import dynamic from "next/dynamic";
import SectionSkeleton from "./_skeleton";

const HonoursManager = dynamic(
  () => import("../HonoursManager"),
  {
    ssr: false,
    loading: () => <SectionSkeleton label="Logros y reconocimientos" />,
  },
);

export default HonoursManager;
