// src/components/auth/InOutButtons.tsx
"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function InOutButtons() {
  const t = useTranslations("common");
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/auth/sign-in"
        className="inline-flex items-center rounded-bh-md border border-bh-fg-4 px-3.5 py-2 text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:border-bh-fg-3 hover:bg-white/[0.06] hover:text-bh-fg-1"
      >
        {t("authButtons.access")}
      </Link>
      <Link
        href="/auth/sign-up"
        className="inline-flex items-center rounded-bh-md bg-bh-blue px-4 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(0,194,255,0.3)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#19ccff] hover:shadow-[0_4px_20px_rgba(0,194,255,0.5)]"
      >
        {t("authButtons.create")}
      </Link>
    </div>
  );
}
