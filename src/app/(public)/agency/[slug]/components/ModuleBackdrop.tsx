"use client";

import { motion } from "framer-motion";

type Variant =
  | "soft"
  | "rings"
  | "pulse"
  | "twin"
  | "halo";

type Props = {
  variant?: Variant;
  /** Horizontal anchor of the dominant orb. */
  align?: "left" | "right" | "center";
};

/**
 * Per-section accent. Renders WITHOUT a clipping container so its glow can
 * spill into adjacent sections — preventing the "cards" feel. The global
 * background (grid, scan lines, base orbs) lives in <GlobalAmbient/>; this
 * component only adds a localized highlight that hints at the section.
 */
export default function ModuleBackdrop({ variant = "soft", align = "right" }: Props) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-x-32 -inset-y-40 -z-10"
    >
      <DecorLayer variant={variant} />
      <SpotlightOrb variant={variant} align={align} />
    </div>
  );
}

function SpotlightOrb({ variant, align }: { variant: Variant; align: "left" | "right" | "center" }) {
  const horizontal =
    align === "left"
      ? { left: "-6%" }
      : align === "right"
      ? { right: "-6%" }
      : { left: "50%", transform: "translateX(-50%)" };

  if (variant === "twin") {
    return (
      <>
        <motion.div
          className="absolute rounded-full blur-[160px] opacity-[0.22] mix-blend-screen"
          style={{
            backgroundColor: "var(--theme-accent)",
            width: 620,
            height: 620,
            top: "10%",
            left: "-8%",
          }}
          animate={{ x: [0, 40, 0], y: [0, 25, 0] }}
          transition={{ duration: 22, ease: "easeInOut", repeat: Infinity }}
        />
        <motion.div
          className="absolute rounded-full blur-[160px] opacity-[0.18] mix-blend-screen"
          style={{
            backgroundColor: "var(--theme-primary)",
            width: 540,
            height: 540,
            bottom: "10%",
            right: "-6%",
          }}
          animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
          transition={{ duration: 26, ease: "easeInOut", repeat: Infinity }}
        />
      </>
    );
  }

  return (
    <motion.div
      className="absolute rounded-full blur-[160px] opacity-[0.22] mix-blend-screen"
      style={{
        backgroundColor: "var(--theme-accent)",
        width: 600,
        height: 600,
        top: "20%",
        ...horizontal,
      }}
      animate={{
        x: [0, align === "left" ? 35 : -35, 0],
        y: [0, 25, -10, 0],
      }}
      transition={{ duration: 22, ease: "easeInOut", repeat: Infinity }}
    />
  );
}

function DecorLayer({ variant }: { variant: Variant }) {
  switch (variant) {
    case "rings":
      return (
        <motion.div
          aria-hidden
          className="absolute inset-0 opacity-[0.16] mix-blend-screen"
          style={{
            backgroundImage:
              "repeating-radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--theme-accent) 20%, transparent) 0px, color-mix(in srgb, var(--theme-accent) 20%, transparent) 1px, transparent 1px, transparent 90px)",
            maskImage:
              "radial-gradient(circle at 50% 50%, #000 0%, transparent 60%)",
            WebkitMaskImage:
              "radial-gradient(circle at 50% 50%, #000 0%, transparent 60%)",
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 14, ease: "easeInOut", repeat: Infinity }}
        />
      );

    case "pulse":
      return (
        <motion.div
          aria-hidden
          className="absolute"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 480,
            height: 480,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--theme-accent) 20%, transparent) 0%, transparent 70%)",
          }}
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
        />
      );

    case "halo":
      return (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 40%, color-mix(in srgb, var(--theme-accent) 8%, transparent) 0%, transparent 75%)",
          }}
        />
      );

    case "twin":
      return null;

    case "soft":
    default:
      return null;
  }
}
