"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AnimatedStatProps = {
  value: string;
  label: string;
  delay?: number;
  /** Solid color used for the underline + textShadow. Hex or any CSS color. */
  accentColor: string;
  /** Second color for the gradient bar; defaults to accentColor. */
  altColor?: string;
  /** Color of the big number. */
  fgColor?: string;
  /** Color of the small label. */
  labelColor?: string;
  /** Font for the number. */
  numberFont?: string;
  /** Font for the label. */
  labelFont?: string;
};

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "").match(/^([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (!m) return `rgba(255,255,255,${alpha})`;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function AnimatedStat({
  value,
  label,
  delay = 0,
  accentColor,
  altColor,
  fgColor = "#FFFFFF",
  labelColor = "rgba(255,255,255,0.40)",
  numberFont = "var(--font-barlow-condensed), 'Barlow Condensed', sans-serif",
  labelFont = "var(--font-dm-mono), 'DM Mono', monospace",
}: AnimatedStatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const [display, setDisplay] = useState("0");
  const [done, setDone] = useState(false);

  const parsed = useMemo(() => {
    const m = value.match(/^([+]?)([\d.]+)(.*)$/);
    if (!m) return { prefix: "", target: 0, suffix: value, decimals: 0 };
    const numStr = m[2];
    const target = parseFloat(numStr);
    const decimals = (numStr.split(".")[1] || "").length;
    return { prefix: m[1], target, suffix: m[3], decimals };
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(parsed.prefix + parsed.target.toFixed(parsed.decimals) + parsed.suffix);
      setDone(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            const dur = 1400;
            const t0 = performance.now();
            const tick = (t: number) => {
              const p = Math.min(1, (t - t0) / dur);
              const eased = 1 - Math.pow(1 - p, 3);
              const cur = parsed.target * eased;
              setDisplay(parsed.prefix + cur.toFixed(parsed.decimals) + parsed.suffix);
              if (p < 1) requestAnimationFrame(tick);
              else setDone(true);
            };
            window.setTimeout(() => requestAnimationFrame(tick), delay);
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay, parsed]);

  const glow = hexToRgba(accentColor, 0.25);
  const barShadow = hexToRgba(accentColor, 0.5);
  const gradientFrom = accentColor;
  const gradientTo = altColor || accentColor;

  return (
    <div ref={ref} style={{ position: "relative", padding: "28px 24px" }}>
      <div
        style={{
          fontFamily: numberFont,
          fontSize: 40,
          fontWeight: 900,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          color: fgColor,
          marginBottom: 4,
          textShadow: done ? `0 0 24px ${glow}` : "none",
          transition: "text-shadow 600ms ease",
        }}
      >
        {display}
      </div>
      <div
        style={{
          fontFamily: labelFont,
          fontSize: 11,
          color: labelColor,
          textTransform: "uppercase",
          letterSpacing: "0.10em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: "absolute",
          left: 24,
          right: 24,
          bottom: 18,
          height: 2,
          borderRadius: 2,
          overflow: "hidden",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            width: done ? "100%" : "0%",
            height: "100%",
            background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
            transition: `width 1400ms cubic-bezier(0.25,0,0,1) ${delay}ms`,
            boxShadow: `0 0 8px ${barShadow}`,
          }}
        />
      </div>
    </div>
  );
}
