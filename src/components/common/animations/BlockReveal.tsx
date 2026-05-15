"use client";

import { motion, useInView, useAnimation } from "framer-motion";
import { useEffect, useRef } from "react";

interface BlockRevealProps {
  children: React.ReactNode;
  blockColor?: string;
  delay?: number;
  className?: string;
}

export function BlockReveal({ children, blockColor = "var(--theme-primary)", delay = 0, className = "w-fit" }: BlockRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const mainControls = useAnimation();
  const slideControls = useAnimation();

  useEffect(() => {
    if (isInView) {
      mainControls.start("visible");
      slideControls.start("visible");
    }
  }, [isInView, mainControls, slideControls]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate={mainControls}
        transition={{ duration: 0.5, delay: delay + 0.35, ease: "easeOut" }}
      >
        {children}
      </motion.div>
      <motion.div
        variants={{
          hidden: { left: 0, right: "100%" },
          visible: { 
            left: ["0%", "0%", "100%"], 
            right: ["100%", "0%", "0%"]
          },
        }}
        initial="hidden"
        animate={slideControls}
        transition={{ duration: 0.7, ease: "easeInOut", delay: delay }}
        className="absolute top-0 bottom-0 z-20"
        style={{ background: blockColor }}
      />
    </div>
  );
}
