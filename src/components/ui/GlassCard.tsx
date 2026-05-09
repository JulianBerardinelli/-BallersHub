"use client";

import * as React from "react";
import { useEffect, useRef } from "react";

export type GlassCardVariant = "neutral" | "accent" | "primary" | "dark";

type Props = {
  variant?: GlassCardVariant;
  /** Disable the 3D tilt effect (still keeps glass + hover glow). */
  noTilt?: boolean;
  /** Maximum tilt in degrees. Default 10. */
  maxTilt?: number;
  /** Override default border radius (px). */
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/**
 * Glassmorphism card with 3D tilt + cursor-follow glare overlay.
 * Theme-aware: variants `accent` and `primary` derive their tint from
 * `--theme-accent` / `--theme-primary` so they match the portfolio palette.
 *
 * Adapted from the BallersHub design system (components-cards.html).
 *
 * Always renders as <div> + <div>. For navigation, wrap with <Link>
 * externally. For full-card hit areas inside a card, position children
 * absolutely with z-index above the glare.
 */
export default function GlassCard({
  variant = "neutral",
  noTilt = false,
  maxTilt = 10,
  radius = 16,
  className = "",
  style,
  children,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (noTilt) return;
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    const glare = glareRef.current;
    if (!wrap || !inner) return;

    let raf = 0;

    const onMove = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rotY = ((x - cx) / cx) * maxTilt;
      const rotX = -((y - cy) / cy) * maxTilt;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        inner.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.025)`;
        inner.style.boxShadow = `${-rotY * 1.4}px ${rotX * 1.4}px 38px rgba(0,0,0,0.45)`;

        if (glare) {
          const gx = (x / rect.width) * 100;
          const gy = (y / rect.height) * 100;
          glare.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.14) 0%, transparent 55%)`;
        }
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(raf);
      inner.style.transform = "";
      inner.style.boxShadow = "";
      if (glare) glare.style.background = "";
    };

    wrap.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener("mousemove", onMove);
      wrap.removeEventListener("mouseleave", onLeave);
    };
  }, [noTilt, maxTilt]);

  const variantStyles: Record<GlassCardVariant, React.CSSProperties> = {
    neutral: {
      background: "rgba(255,255,255,0.05)",
      backdropFilter: "blur(18px) saturate(160%)",
      WebkitBackdropFilter: "blur(18px) saturate(160%)",
      border: "1px solid rgba(255,255,255,0.10)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
    },
    accent: {
      background: "color-mix(in srgb, var(--theme-accent) 7%, transparent)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      border: "1px solid color-mix(in srgb, var(--theme-accent) 22%, transparent)",
      boxShadow:
        "0 0 28px color-mix(in srgb, var(--theme-accent) 9%, transparent), inset 0 1px 0 color-mix(in srgb, var(--theme-accent) 14%, transparent)",
    },
    primary: {
      background: "color-mix(in srgb, var(--theme-primary) 7%, transparent)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      border: "1px solid color-mix(in srgb, var(--theme-primary) 22%, transparent)",
      boxShadow:
        "0 0 28px color-mix(in srgb, var(--theme-primary) 9%, transparent), inset 0 1px 0 color-mix(in srgb, var(--theme-primary) 14%, transparent)",
    },
    dark: {
      background: "rgba(15,15,15,0.72)",
      backdropFilter: "blur(24px) saturate(140%)",
      WebkitBackdropFilter: "blur(24px) saturate(140%)",
      border: "1px solid rgba(255,255,255,0.07)",
      boxShadow: "0 22px 60px rgba(0,0,0,0.55)",
    },
  };

  return (
    <div
      ref={wrapRef}
      className="glass-card-wrap"
      style={{
        perspective: noTilt ? undefined : 900,
        position: "relative",
        height: "100%",
      }}
    >
      <div
        ref={innerRef}
        className={`glass-card-inner ${className}`}
        style={{
          ...variantStyles[variant],
          borderRadius: radius,
          transformStyle: noTilt ? undefined : "preserve-3d",
          transition:
            "transform 400ms cubic-bezier(0.25,0,0,1), box-shadow 400ms cubic-bezier(0.25,0,0,1)",
          willChange: noTilt ? undefined : "transform",
          position: "relative",
          overflow: "hidden",
          height: "100%",
          ...style,
        }}
      >
        {!noTilt && (
          <span
            ref={glareRef}
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: "inherit",
              zIndex: 10,
              background:
                "radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 0%, transparent 60%)",
              transition: "opacity 250ms",
              mixBlendMode: "overlay",
            }}
          />
        )}
        {children}
      </div>
    </div>
  );
}
