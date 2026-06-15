// Status chip used in /blog/drafts and /admin/blog. The label resolves via
// the `blog.status` namespace (registered globally in `src/i18n/request.ts`)
// so /admin callers don't need to opt in — their layout already provides
// next-intl messages.

import { useTranslations } from "next-intl";
import { STATUS_TONE } from "@/lib/blog/labels";
import type { BlogStatus } from "@/db/schema";

const TONE_CLASSES: Record<(typeof STATUS_TONE)[BlogStatus], string> = {
  neutral: "border-bh-fg-4 bg-bh-fg-4/10 text-bh-fg-2",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  success: "border-bh-lime/40 bg-bh-lime/10 text-bh-lime",
  danger: "border-red-500/40 bg-red-500/10 text-red-300",
};

export function StatusBadge({ status }: { status: BlogStatus }) {
  const t = useTranslations("blog.status");
  const tone = STATUS_TONE[status];
  return (
    <span
      className={
        "inline-flex items-center rounded-bh-pill border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] " +
        TONE_CLASSES[tone]
      }
    >
      {t(status)}
    </span>
  );
}
