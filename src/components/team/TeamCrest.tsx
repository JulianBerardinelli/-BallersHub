// src/components/team/TeamCrest.tsx
"use client";

import Image from "next/image";
import { teamLogoUrl } from "@/lib/storage";

export default function TeamCrest({
  path,
  name,
  size = 20,
  className = "",
}: {
  path?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const url = teamLogoUrl(path);
  return (
    <Image
      src={url}
      alt={`${name} crest`}
      width={size}
      height={size}
      className={`rounded-[3px] shrink-0 ${className}`}
    />
  );
}
