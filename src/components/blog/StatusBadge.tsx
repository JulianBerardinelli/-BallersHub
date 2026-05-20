// Status chip used in /blog/drafts and /admin/blog.

import { STATUS_LABELS, STATUS_TONE } from "@/lib/blog/labels";
import type { BlogStatus } from "@/db/schema";

const TONE_CLASSES: Record<(typeof STATUS_TONE)[BlogStatus], string> = {
  neutral: "border-bh-fg-4 bg-bh-fg-4/10 text-bh-fg-2",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  success: "border-bh-lime/40 bg-bh-lime/10 text-bh-lime",
  danger: "border-red-500/40 bg-red-500/10 text-red-300",
};

export function StatusBadge({ status }: { status: BlogStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={
        "inline-flex items-center rounded-bh-pill border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] " +
        TONE_CLASSES[tone]
      }
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
