"use client";

import { useTranslations } from "next-intl";

export default function SectionSkeleton({ labelKey }: { labelKey: string }) {
  const t = useTranslations("dashAgency");
  return (
    <div className="rounded-bh-lg border border-white/[0.06] bg-bh-surface-1/40 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-fg-4">
        {t(`lazy.${labelKey}`)}
      </p>
      <div className="mt-3 h-24 animate-pulse rounded-bh-md bg-white/[0.04]" />
    </div>
  );
}
