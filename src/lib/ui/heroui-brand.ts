// Reusable BallersHub-branded HeroUI classNames presets.
// Drop into <Input classNames={bhInputClassNames} /> etc.

export const bhInputClassNames = {
  inputWrapper:
    "bg-bh-surface-1 border border-white/[0.08] shadow-none transition-colors duration-150 hover:border-white/[0.18] group-data-[focus=true]:border-bh-lime group-data-[focus=true]:bg-bh-surface-1 data-[invalid=true]:border-bh-danger data-[invalid=true]:hover:border-bh-danger",
  input:
    "text-[14px] text-bh-fg-1 placeholder:text-bh-fg-4",
  label:
    "!text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2",
  description: "text-bh-fg-4 text-[11px]",
  errorMessage: "text-bh-danger text-[11px]",
} as const;

// Some HeroUI inputs (DatePicker, Autocomplete) accept the same shape,
// alias for clarity at the call site.
export const bhDatePickerClassNames = bhInputClassNames;

// Buttons: primary (lime), secondary (blue), outline, ghost, danger.
export const bhPrimaryButton =
  "rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0";

export const bhSecondaryButton =
  "rounded-bh-md bg-bh-blue px-5 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(0,194,255,0.3)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#19ccff] hover:shadow-[0_4px_20px_rgba(0,194,255,0.5)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0";

export const bhOutlineButton =
  "rounded-bh-md border border-bh-fg-4 px-5 py-2 text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:border-bh-fg-3 hover:bg-white/[0.06] hover:text-bh-fg-1 disabled:cursor-not-allowed disabled:opacity-40";

export const bhGhostButton =
  "rounded-bh-md px-3 py-2 text-[13px] text-bh-fg-3 transition-colors duration-150 hover:bg-white/[0.06] hover:text-bh-fg-1";

export const bhDangerButton =
  "rounded-bh-md border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] px-4 py-2 text-[13px] font-medium text-bh-danger transition-colors duration-150 hover:bg-[rgba(239,68,68,0.16)]";

// HeroUI Table — admin-style dark table with display column headers.
export const bhTableClassNames = {
  wrapper:
    "rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-0 shadow-none",
  table: "w-full",
  thead:
    "[&_th]:bg-transparent [&_th]:font-bh-display [&_th]:text-[10px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[0.1em] [&_th]:text-bh-fg-4 [&_th]:border-b [&_th]:border-white/[0.06]",
  tr: "border-b border-white/[0.04] data-[hover=true]:bg-white/[0.02] last:border-b-0",
  td: "text-[13px] text-bh-fg-2 align-middle",
  emptyWrapper: "text-bh-fg-3",
  loadingWrapper: "text-bh-fg-3",
} as const;

// HeroUI Modal — brand chrome. Spread as classNames or merge with overrides.
export const bhModalClassNames = {
  base: "bg-bh-surface-1 border border-white/[0.08]",
  backdrop: "backdrop-blur-md bg-black/75",
  header:
    "font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1 border-b border-white/[0.06]",
  body: "py-5",
  footer: "border-t border-white/[0.06]",
  closeButton: "text-bh-fg-3 hover:bg-white/[0.06] hover:text-bh-fg-1",
} as const;

// HeroUI Select — branded trigger + listbox.
export const bhSelectClassNames = {
  label:
    "!text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2",
  trigger:
    "bg-bh-surface-1 border border-white/[0.08] data-[hover=true]:border-white/[0.18] data-[focus=true]:border-bh-lime data-[open=true]:border-bh-lime shadow-none",
  value: "text-[14px] text-bh-fg-1",
  selectorIcon: "text-bh-fg-3",
  listbox: "bg-bh-surface-1",
  popoverContent:
    "bg-bh-surface-1 border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.7)] p-1 rounded-bh-lg",
  description: "text-[11px] text-bh-fg-4",
  errorMessage: "text-[11px] text-bh-danger",
} as const;

// HeroUI Switch — lime when on.
export const bhSwitchClassNames = {
  wrapper: "group-data-[selected=true]:bg-bh-lime",
  thumb: "bg-bh-fg-1 group-data-[selected=true]:bg-bh-black",
  label: "text-[13px] text-bh-fg-2",
} as const;

// HeroUI Accordion — splitted brand variant.
export const bhAccordionItemClassNames = {
  base:
    "rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 shadow-none data-[open=true]:border-[rgba(204,255,0,0.18)]",
  title: "text-bh-fg-1",
  trigger: "px-4 py-3",
  content: "px-4 pb-4 pt-0",
  indicator: "text-bh-fg-3",
} as const;

// Chip presets by tone (HeroUI Chip classNames).
type ChipTone = "neutral" | "lime" | "blue" | "success" | "warning" | "danger" | "outline";

export function bhChip(tone: ChipTone = "neutral") {
  const baseContent = "text-[11px] font-semibold uppercase tracking-[0.06em]";
  const tones: Record<ChipTone, string> = {
    neutral: "border border-white/[0.12] bg-white/[0.06] text-bh-fg-2",
    lime: "border border-[rgba(204,255,0,0.22)] bg-[rgba(204,255,0,0.10)] text-bh-lime",
    blue: "border border-[rgba(0,194,255,0.22)] bg-[rgba(0,194,255,0.10)] text-bh-blue",
    success: "border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.10)] text-bh-success",
    warning: "border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.10)] text-bh-warning",
    danger: "border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.10)] text-bh-danger",
    outline: "border border-bh-fg-4 bg-transparent text-bh-fg-3",
  };
  return {
    base: tones[tone],
    content: baseContent,
  };
}
