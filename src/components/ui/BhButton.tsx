// BallersHub branded button primitive.
//
// Renders a native <button> by default, or polymorphic-as via the `as` prop
// (e.g. <BhButton as={Link} href="/x">). Designed for content-rendering use;
// for HeroUI-flow use cases (Modal footers, etc.) keep using HeroUI <Button>
// with the same visual class via `bhButtonClass(...)`.

"use client";

import * as React from "react";
import { bhButtonClass, type BhButtonVariant, type BhButtonSize } from "./bh-button-class";

// Re-exported for backward compatibility. Prefer importing from
// `@/components/ui/bh-button-class` in server components.
export { bhButtonClass };
export type { BhButtonVariant, BhButtonSize };

type AsProp<C extends React.ElementType> = { as?: C };
type ChildrenAndClass = { className?: string; children?: React.ReactNode };
type Polymorphic<C extends React.ElementType, P> = P &
  AsProp<C> &
  ChildrenAndClass &
  Omit<React.ComponentPropsWithoutRef<C>, keyof P | "as" | "className" | "children">;

export type BhButtonProps<C extends React.ElementType = "button"> = Polymorphic<
  C,
  {
    variant?: BhButtonVariant;
    size?: BhButtonSize;
    iconOnly?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    isLoading?: boolean;
  }
>;

export default function BhButton<C extends React.ElementType = "button">({
  as,
  variant = "lime",
  size = "md",
  iconOnly = false,
  leftIcon,
  rightIcon,
  isLoading = false,
  disabled,
  className = "",
  children,
  ...rest
}: BhButtonProps<C>) {
  const Component = (as ?? "button") as React.ElementType;
  const isDisabled = !!disabled || isLoading;
  const composed = bhButtonClass({ variant, size, iconOnly, className });

  return (
    <Component
      {...(rest as Record<string, unknown>)}
      className={composed}
      disabled={Component === "button" ? isDisabled : undefined}
      aria-disabled={isDisabled || undefined}
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </Component>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
    />
  );
}
