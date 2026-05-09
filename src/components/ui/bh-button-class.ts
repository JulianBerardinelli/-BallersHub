// Pure className helper for the BallersHub button visual.
// Server-safe: callable from server components and from `"use client"` files.

export type BhButtonVariant =
  | "lime"
  | "blue"
  | "outline"
  | "ghost"
  | "danger"
  | "danger-soft"
  | "icon-ghost"
  | "icon-danger";

export type BhButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

const VARIANT_CLASS: Record<BhButtonVariant, string> = {
  lime:
    "bg-bh-lime text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]",
  blue:
    "bg-bh-blue text-bh-black shadow-[0_2px_12px_rgba(0,194,255,0.30)] hover:-translate-y-px hover:bg-[#19ccff] hover:shadow-[0_4px_20px_rgba(0,194,255,0.50)]",
  outline:
    "border border-bh-fg-4 bg-transparent text-bh-fg-2 hover:border-bh-fg-3 hover:bg-white/[0.06] hover:text-bh-fg-1",
  ghost:
    "bg-transparent text-bh-fg-2 hover:bg-white/[0.06] hover:text-bh-fg-1",
  danger:
    "bg-bh-danger text-bh-fg-1 shadow-[0_2px_12px_rgba(239,68,68,0.30)] hover:-translate-y-px hover:bg-[#f87171]",
  "danger-soft":
    "border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-bh-danger hover:bg-[rgba(239,68,68,0.16)]",
  "icon-ghost":
    "bg-transparent text-bh-fg-3 hover:bg-white/[0.06] hover:text-bh-fg-1",
  "icon-danger":
    "bg-transparent text-bh-fg-3 hover:bg-[rgba(239,68,68,0.08)] hover:text-bh-danger",
};

const SIZE_CLASS: Record<BhButtonSize, string> = {
  xs: "h-7 px-2.5 text-[11px] rounded-bh-md gap-1.5",
  sm: "h-8 px-3.5 text-[12px] rounded-bh-md gap-1.5",
  md: "h-9 px-4 text-[13px] rounded-bh-md gap-2",
  lg: "h-10 px-5 text-[14px] rounded-bh-md gap-2",
  xl: "h-12 px-6 text-[15px] rounded-bh-lg gap-2 font-bh-display uppercase tracking-[0.04em]",
};

const ICON_SIZE_CLASS: Record<BhButtonSize, string> = {
  xs: "h-7 w-7 rounded-bh-md",
  sm: "h-8 w-8 rounded-bh-md",
  md: "h-9 w-9 rounded-bh-md",
  lg: "h-10 w-10 rounded-bh-md",
  xl: "h-12 w-12 rounded-bh-lg",
};

const BASE_CLASS =
  "inline-flex shrink-0 items-center justify-center font-semibold transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-bh-lime/50";

/**
 * Compose the brand button className. Useful for HeroUI <Button className=...> too.
 */
export function bhButtonClass({
  variant = "lime",
  size = "md",
  iconOnly = false,
  className = "",
}: {
  variant?: BhButtonVariant;
  size?: BhButtonSize;
  iconOnly?: boolean;
  className?: string;
} = {}) {
  return [
    BASE_CLASS,
    iconOnly ? ICON_SIZE_CLASS[size] : SIZE_CLASS[size],
    VARIANT_CLASS[variant],
    className,
  ].join(" ");
}
