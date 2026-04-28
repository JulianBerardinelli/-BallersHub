// Branded empty / loading / placeholder block.
// Use for "No items", "No results", "Coming soon" surfaces in admin/dashboard.

import * as React from "react";

type BhEmptyStateProps = {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  /** dashed = empty/zero state, solid = informational */
  variant?: "dashed" | "solid";
  className?: string;
};

export default function BhEmptyState({
  icon,
  title,
  description,
  action,
  variant = "dashed",
  className = "",
}: BhEmptyStateProps) {
  const wrapperClass =
    variant === "dashed"
      ? "border border-dashed border-white/[0.08] bg-bh-surface-1/40"
      : "border border-white/[0.08] bg-bh-surface-1";

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-bh-lg px-6 py-12 text-center ${wrapperClass} ${className}`}
    >
      {icon ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-bh-md border border-white/[0.08] bg-bh-surface-2/60 text-bh-fg-3">
          {icon}
        </div>
      ) : null}
      {title ? (
        <p className="font-bh-display text-base font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          {title}
        </p>
      ) : null}
      {description ? (
        <p className="max-w-md text-[13px] leading-[1.55] text-bh-fg-3">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
