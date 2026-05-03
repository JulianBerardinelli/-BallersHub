"use client";

// Scroll-triggered reveal helpers used by the pricing page sections.
// Built on framer-motion's `whileInView` so animations only fire once
// the user actually scrolls the section into view (cheap on cold load,
// snappy at the seam).

import { m, type Variants } from "framer-motion";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** Vertical offset to ease in from. Negative slides down, positive slides up. */
  y?: number;
  duration?: number;
  /** Animate every time the element enters the viewport (default: once on first entry). */
  every?: boolean;
};

export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  duration = 0.6,
  every = false,
}: RevealProps) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: !every, margin: "-12% 0px -10% 0px" }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </m.div>
  );
}

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE },
  },
};

type StaggerProps = {
  children: React.ReactNode;
  className?: string;
  /** Override default 0.08s stagger. */
  stagger?: number;
  /** Override default 0.1s delay before first child animates. */
  initialDelay?: number;
};

export function RevealStagger({
  children,
  className,
  stagger,
  initialDelay,
}: StaggerProps) {
  const variants: Variants =
    stagger == null && initialDelay == null
      ? containerVariants
      : {
          hidden: {},
          visible: {
            transition: {
              staggerChildren: stagger ?? 0.08,
              delayChildren: initialDelay ?? 0.1,
            },
          },
        };

  return (
    <m.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-12% 0px -10% 0px" }}
      variants={variants}
    >
      {children}
    </m.div>
  );
}

type ItemProps = {
  children: React.ReactNode;
  className?: string;
  /** Override default item variants (e.g. larger y, custom timing). */
  variants?: Variants;
};

export function RevealItem({ children, className, variants }: ItemProps) {
  return (
    <m.div className={className} variants={variants ?? itemVariants}>
      {children}
    </m.div>
  );
}
