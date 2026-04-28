"use client";

import * as React from "react";
import { Check } from "lucide-react";

type BhCheckboxProps = {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
};

export function BhCheckbox({
  id,
  checked,
  onChange,
  disabled,
  children,
  className = "",
}: BhCheckboxProps) {
  const reactId = React.useId();
  const inputId = id ?? reactId;

  return (
    <label
      htmlFor={inputId}
      className={`group inline-flex cursor-pointer items-center gap-2.5 ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      } ${className}`}
    >
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-[4px] border border-white/[0.18] bg-bh-surface-1 transition-colors duration-150 group-hover:border-white/[0.32] peer-checked:border-bh-lime peer-checked:bg-bh-lime peer-focus-visible:ring-2 peer-focus-visible:ring-bh-lime/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bh-black"
        />
        {checked ? (
          <Check className="relative h-3 w-3 stroke-[3] text-bh-black" aria-hidden />
        ) : null}
      </span>
      {children ? (
        <span className="text-[13px] leading-tight text-bh-fg-2">{children}</span>
      ) : null}
    </label>
  );
}
