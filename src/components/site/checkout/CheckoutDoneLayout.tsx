// Shared layout for /checkout/{success,failure,pending}.
// Each done page customises the icon, title, accent and primary CTA.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type CheckoutDoneLayoutProps = {
  /** Visual mood — drives accent + icon background. */
  variant: "success" | "failure" | "pending";
  Icon: LucideIcon;
  title: React.ReactNode;
  description: React.ReactNode;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  /** Extra slot for plan info / receipt details. */
  details?: React.ReactNode;
};

const VARIANT = {
  success: {
    iconWrap:
      "bg-bh-success/10 border-bh-success/30 text-bh-success",
    accentText: "text-bh-success",
  },
  failure: {
    iconWrap:
      "bg-bh-danger/10 border-bh-danger/30 text-bh-danger",
    accentText: "text-bh-danger",
  },
  pending: {
    iconWrap:
      "bg-bh-warning/10 border-bh-warning/30 text-bh-warning",
    accentText: "text-bh-warning",
  },
} as const;

export default function CheckoutDoneLayout(props: CheckoutDoneLayoutProps) {
  const variant = VARIANT[props.variant];

  return (
    <div className="mx-auto max-w-xl space-y-8 py-10 text-center">
      <span
        className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border ${variant.iconWrap}`}
      >
        <props.Icon className="h-7 w-7" />
      </span>

      <div className="space-y-3">
        <h1 className="font-bh-display text-3xl font-black uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          {props.title}
        </h1>
        <p className="text-[14px] leading-[1.6] text-bh-fg-2">
          {props.description}
        </p>
      </div>

      {props.details && (
        <div className="bh-glass mx-auto max-w-md rounded-bh-xl p-5 text-left">
          {props.details}
        </div>
      )}

      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href={props.primary.href}
          className="inline-flex items-center justify-center gap-2 rounded-bh-md bg-bh-lime px-6 py-3 text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
        >
          {props.primary.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
        {props.secondary && (
          <Link
            href={props.secondary.href}
            className="inline-flex items-center justify-center gap-2 rounded-bh-md border border-white/[0.12] px-6 py-3 text-[13px] font-semibold text-bh-fg-2 transition-colors duration-150 hover:bg-white/[0.06] hover:text-bh-fg-1"
          >
            {props.secondary.label}
          </Link>
        )}
      </div>
    </div>
  );
}
