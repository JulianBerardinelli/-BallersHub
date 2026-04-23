"use client";

import { motion } from "framer-motion";

export default function BioAnimatedBackground() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] min-h-[120vh] z-0 overflow-hidden pointer-events-none" style={{ maskImage: "radial-gradient(ellipse at center, white 40%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at center, white 40%, transparent 80%)" }}>
      {/* Subtle Noise / Grid layer - More visible */}
      <div 
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay" 
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)', backgroundSize: '32px 32px' }}
      />
      
      {/* Floating Ambient Orbs mapped to theme - Faster, larger, bolder */}
      <motion.div
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.15, 0.4, 0.15],
          x: [0, 120, -50, 0],
          y: [0, -100, 80, 0]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[5%] left-[10%] w-[700px] h-[700px] rounded-full blur-[150px] mix-blend-screen"
        style={{ background: "color-mix(in srgb, var(--theme-primary) 100%, transparent)" }}
      />

      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.15, 0.3, 0.15],
          x: [0, -150, 80, 0],
          y: [0, 120, -100, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[10%] right-[5%] w-[800px] h-[800px] rounded-full blur-[160px] mix-blend-screen"
        style={{ background: "color-mix(in srgb, var(--theme-accent) 100%, transparent)" }}
      />

      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.25, 0.1],
          x: [0, 100, -80, 0],
          y: [0, 80, -120, 0]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute top-[40%] left-[40%] w-[600px] h-[600px] rounded-full blur-[150px] mix-blend-screen"
        style={{ background: "color-mix(in srgb, var(--theme-secondary) 100%, transparent)" }}
      />
    </div>
  );
}
