"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type Props = {
  value: number;
  delay?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Animated count-up counter. Used by the Free portfolio totals strip
 * and per-row career stats. Triggers once on first paint after `delay`.
 * Cheap RAF loop, no third-party deps.
 */
export default function CountUp({
  value,
  delay = 0,
  duration = 1200,
  className,
  style,
}: Props) {
  const [n, setN] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const target = Number.isFinite(value) ? Math.max(0, value) : 0;
    let raf = 0;
    const startAt = performance.now() + delay;

    const tick = (now: number) => {
      if (now < startAt) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - startAt) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, delay, duration]);

  return (
    <span className={className} style={style}>
      {new Intl.NumberFormat("es-AR").format(n)}
    </span>
  );
}

/**
 * Companion: thin line at the bottom of a stat cell that fills as the
 * count-up runs and then sits at 100%. Pure CSS transition.
 */
export function CountBar({
  delay = 0,
  duration = 1400,
}: {
  delay?: number;
  duration?: number;
}) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), delay + duration);
    return () => clearTimeout(t);
  }, [delay, duration]);
  return (
    <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-bh-fg-4/30">
      <div
        className="absolute inset-0 bg-bh-lime"
        style={{
          transform: done ? "translateX(0)" : "translateX(-100%)",
          transition: `transform ${duration}ms cubic-bezier(0.25,0,0,1) ${delay}ms`,
        }}
      />
    </div>
  );
}
