"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";

type Props = {
  value: number;
  /** Animation duration in seconds. Default 1.4. */
  duration?: number;
  /** Optional value formatter (e.g. zero-pad). Defaults to integer round. */
  format?: (n: number) => string;
  /** Pad numeric output with leading zero(s) until reaching this width. */
  padStart?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Initial placeholder text rendered server-side / before motion kicks in. */
  initial?: string;
};

/**
 * Lightweight count-up that animates once when scrolled into view.
 *
 * Render goes through `useState` (not direct DOM mutation) so React's
 * reconciliation never overwrites the animated value when a parent re-renders
 * — that's a classic bug with imperative DOM updates inside JSX trees.
 */
export default function CountUp({
  value,
  duration = 1.4,
  format,
  padStart,
  className,
  style,
  initial,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  const fmt = (n: number) => {
    if (format) return format(n);
    const rounded = Math.round(n);
    return padStart ? String(rounded).padStart(padStart, "0") : String(rounded);
  };

  const placeholder =
    initial ??
    (padStart ? "0".repeat(Math.max(padStart, String(value).length)) : "0");

  const [display, setDisplay] = useState<string>(placeholder);

  useEffect(() => {
    if (!inView) return;

    if (value === 0) {
      setDisplay(fmt(0));
      return;
    }

    const ctrl = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(latest) {
        setDisplay(fmt(latest));
      },
    });

    return () => ctrl.stop();
    // We intentionally exclude `fmt` from deps — it's a closure reference
    // and rebuilding it on every render would restart the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className} style={style}>
      {display}
    </span>
  );
}
