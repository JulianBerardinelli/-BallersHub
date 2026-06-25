"use client";

// Shared presentational atoms for the Pro coach modules. Extracted from the
// old inline CoachProContent so every module renders with the same visual
// language (section eyebrow rule + scroll reveal + accent sub-labels) without
// duplicating the markup. Each module imports what it needs from here.

import * as React from "react";
import { motion } from "framer-motion";

export function Section({
  id,
  title,
  accent,
  children,
}: {
  id: string;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <Reveal className="mb-8 flex items-center gap-4">
        <span className="h-px w-10" style={{ backgroundColor: accent }} />
        <h2 className="font-bh-display text-xs font-bold uppercase tracking-[0.18em] text-white/50">
          {title}
        </h2>
      </Reveal>
      {children}
    </section>
  );
}

export function SubLabel({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <p
      className="font-bh-display text-[11px] font-bold uppercase tracking-[0.14em]"
      style={{ color: accent }}
    >
      {children}
    </p>
  );
}

export type RevealProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "li";
};

export function Reveal({ children, className, style, as = "div" }: RevealProps) {
  const MotionTag = as === "li" ? motion.li : motion.div;
  return (
    <MotionTag
      className={className}
      style={style}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}
