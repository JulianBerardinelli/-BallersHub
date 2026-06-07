"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDownRight, MapPin, Calendar } from "lucide-react";
import ProAgencyHeader from "./ProAgencyHeader";
import GlobalAmbient from "./GlobalAmbient";
import CountUp from "@/components/ui/CountUp";
import type { AgencyPublicData } from "./AgencyLayoutResolver";

export default function ProAgencyLayout({
  data,
  children,
}: {
  data: AgencyPublicData;
  children?: React.ReactNode;
}) {
  const { agency, theme, players, staffLicenses } = data;
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  // Single soft trail that drifts down on scroll. Multiple stacked trails
  // compete with the marquee + solid title at scroll=0 and look cluttered.
  const trailY = useTransform(scrollYProgress, [0, 1], ["0%", "320%"]);
  const trailOpacity = useTransform(scrollYProgress, [0, 0.05, 0.4], [0, 0.18, 0]);

  const primaryColor = theme?.primaryColor || "#10b981";
  const secondaryColor = theme?.secondaryColor || "#2A2A2A";
  const accentColor = theme?.accentColor || "#34d399";
  const backgroundColor = theme?.backgroundColor || "#050505";

  const titleParts = agency.name.trim().split(/\s+/);
  const monogram = titleParts.length > 1
    ? titleParts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
    : agency.name.slice(0, 2).toUpperCase();

  const cinematicWord = (theme?.heroHeadline || agency.name).toUpperCase();
  const tagline = theme?.heroTagline || agency.tagline || "Agencia de representación";

  const totalLicenses = staffLicenses.reduce((sum, s) => sum + s.licenses.length, 0);

  const wordVariants = {
    hidden: { opacity: 0, scale: 1.2, filter: "blur(20px)" },
    visible: {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: { duration: 0.8, ease: "circOut", delay: 0.2 } as any,
    },
  };

  return (
    <div
      className="min-h-[300vh] text-white w-full flex flex-col items-center"
      style={{
        backgroundColor: backgroundColor,
        '--theme-primary': primaryColor,
        '--theme-secondary': secondaryColor,
        '--theme-accent': accentColor,
        '--theme-background': backgroundColor,
      } as React.CSSProperties}
      ref={containerRef}
    >
      <ProAgencyHeader agency={agency} />

      {/* HERO */}
      <section className="relative h-[100svh] min-h-[760px] w-full flex flex-col items-center justify-center overflow-hidden">
        {/* Layer 0: deep gradient backdrop */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `radial-gradient(ellipse 70% 60% at 50% 30%, color-mix(in srgb, ${accentColor} 8%, transparent) 0%, transparent 70%), linear-gradient(180deg, transparent 0%, var(--theme-background) 95%)`,
          }}
        />

        {/* Layer 1: institutional grid (CSS) — distinct from the player pack */}
        <div
          className="absolute inset-0 z-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(${accentColor}40 1px, transparent 1px), linear-gradient(90deg, ${accentColor}40 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />

        {/* Layer 2: vertical scan lines, very subtle, slow drift */}
        <motion.div
          className="absolute inset-0 z-0 opacity-30 pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)`,
          }}
          animate={{ x: [0, -4, 0] }}
          transition={{ duration: 10, ease: "linear", repeat: Infinity }}
        />

        {/* Layer 3: drifting accent orbs */}
        <motion.div
          className="absolute z-0 rounded-full blur-[140px] opacity-25 pointer-events-none mix-blend-screen"
          style={{
            backgroundColor: accentColor,
            width: 720,
            height: 720,
            top: "20%",
            left: "55%",
          }}
          animate={{ x: [0, -40, 30, 0], y: [0, 25, -15, 0] }}
          transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
        />
        <motion.div
          className="absolute z-0 rounded-full blur-[120px] opacity-20 pointer-events-none mix-blend-screen"
          style={{
            backgroundColor: primaryColor,
            width: 480,
            height: 480,
            bottom: "10%",
            left: "10%",
          }}
          animate={{ x: [0, 30, -20, 0], y: [0, -20, 20, 0] }}
          transition={{ duration: 22, ease: "easeInOut", repeat: Infinity }}
        />

        {/* Layer 4: corner crosshair brackets — institutional/official feel */}
        <CornerBrackets accent={accentColor} />

        {/* Layer 5: noise grain (re-uses pack but lower intensity than player) */}
        <div
          className="absolute inset-0 z-0 mix-blend-overlay opacity-[0.18] pointer-events-none"
          style={{ backgroundImage: `url('/images/pack/particles/noise_1.jpg')`, backgroundSize: "cover" }}
        />

        {/* MARQUEE (background ghost text) */}
        <div className="absolute z-10 overflow-hidden w-full h-full flex flex-col justify-center pointer-events-none select-none opacity-[0.08]">
          <motion.div
            className="flex whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 40 }}
          >
            {[...Array(4)].map((_, i) => (
              <span
                key={i}
                className="text-[20vw] font-black uppercase mx-8 leading-none [-webkit-text-stroke:1px_white] md:[-webkit-text-stroke:1.5px_white] text-transparent"
              >
                {agency.name} · ROSTER · STAFF ·
              </span>
            ))}
          </motion.div>
        </div>

        {/* Single soft trail — appears as you scroll, stays invisible at top */}
        <motion.div
          className="absolute z-15 w-full flex justify-center items-center pointer-events-none select-none mix-blend-screen"
          style={{ y: trailY, opacity: trailOpacity }}
        >
          <h1 className="font-heading font-black uppercase text-[clamp(3rem,11vw,11vw)] leading-[0.85] tracking-tighter text-transparent text-center [-webkit-text-stroke:1px_var(--theme-accent)] md:[-webkit-text-stroke:2px_var(--theme-accent)] px-6">
            {cinematicWord}
          </h1>
        </motion.div>

        {/* CENTERPIECE — single column composition (works on mobile) */}
        <motion.div
          style={{ y: textY }}
          className="relative z-30 flex flex-col items-center text-center px-6 md:px-10 max-w-[1400px] mx-auto"
        >
          {/* Eyebrow: "AGENCIA" with side rules */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="flex items-center justify-center gap-3 md:gap-5 mb-5 md:mb-7"
          >
            <div className="h-px w-8 md:w-16 bg-white/40" />
            <span className="text-[10px] md:text-xs uppercase tracking-[0.4em] md:tracking-[0.5em] text-white/85 font-light">
              Agencia
            </span>
            <div className="h-px w-8 md:w-16 bg-white/40" />
          </motion.div>

          {/* Logo medallion */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
            className="relative mb-6 md:mb-8"
          >
            <div
              className="relative flex items-center justify-center h-[88px] w-[88px] md:h-[104px] md:w-[104px] rounded-2xl backdrop-blur-md overflow-hidden"
              style={{
                border: `1.5px solid ${accentColor}`,
                background: `linear-gradient(135deg, rgba(0,0,0,0.55), color-mix(in srgb, ${accentColor} 12%, transparent))`,
                boxShadow: `0 30px 80px ${accentColor}22, inset 0 0 50px rgba(255,255,255,0.04)`,
              }}
            >
              {agency.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={agency.logoUrl}
                  alt={agency.name}
                  className="h-[68%] w-[68%] object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.7)]"
                />
              ) : (
                <span
                  className="font-heading font-black uppercase text-3xl md:text-4xl tracking-tighter"
                  style={{ color: accentColor }}
                >
                  {monogram}
                </span>
              )}
              <span className="absolute top-1.5 left-1.5 h-2 w-2 border-l border-t" style={{ borderColor: accentColor }} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 border-r border-t" style={{ borderColor: accentColor }} />
              <span className="absolute bottom-1.5 left-1.5 h-2 w-2 border-l border-b" style={{ borderColor: accentColor }} />
              <span className="absolute bottom-1.5 right-1.5 h-2 w-2 border-r border-b" style={{ borderColor: accentColor }} />
            </div>
          </motion.div>

          {/* Cinematic word (front layer, solid white) */}
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={wordVariants}
            className="font-heading font-black uppercase text-[clamp(3rem,11vw,11vw)] leading-[0.85] tracking-tighter text-white drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-balance"
          >
            {cinematicWord}
          </motion.h1>

          {/* Tagline + meta line */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.5 }}
            className="mt-6 md:mt-7 flex flex-col items-center gap-3 max-w-2xl"
          >
            <p className="text-[13px] md:text-base uppercase tracking-[0.32em] md:tracking-[0.38em] text-white/70 font-medium leading-relaxed">
              {tagline}
            </p>

            {(agency.foundationYear || agency.headquarters) && (
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] md:text-xs uppercase tracking-[0.28em] text-white/45">
                {agency.foundationYear && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    EST. {agency.foundationYear}
                  </span>
                )}
                {agency.foundationYear && agency.headquarters && (
                  <span className="hidden sm:inline w-1 h-1 rounded-full bg-white/30" />
                )}
                {agency.headquarters && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" />
                    {agency.headquarters}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Stats strip + scroll cue */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.7 }}
          className="absolute bottom-8 md:bottom-10 left-0 w-full z-50 flex flex-col items-center gap-4 md:gap-5 px-4"
        >
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-10 max-w-[760px]">
            <HeroStat label="Jugadores" value={players.length} accent={accentColor} />
            <HeroStat label="Países" value={agency.operativeCountries?.length ?? 0} accent={accentColor} />
            <HeroStat label="Licencias" value={totalLicenses} accent={accentColor} />
            {agency.foundationYear && (
              <HeroStat label="Fundada" value={agency.foundationYear} accent={accentColor} pad={0} />
            )}
          </div>

          <div className="flex items-center gap-3 text-white/45">
            <span className="text-[10px] tracking-[0.3em] uppercase">Scroll</span>
            <ArrowDownRight className="h-3 w-3 animate-bounce" />
          </div>
        </motion.div>

        {/* Bottom fade into the modules */}
        <div
          className="absolute bottom-0 w-full h-[28vh] z-30 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, var(--theme-background) 8%, transparent 100%)',
          }}
        />
      </section>

      {/* MODULES */}
      <div
        className="relative z-50 w-full min-h-screen pt-32 transition-colors duration-1000 overflow-hidden"
        style={{ backgroundColor: 'var(--theme-background)' }}
      >
        <GlobalAmbient />
        <div className="relative max-w-[1400px] w-full mx-auto px-6 md:px-12 flex flex-col gap-32">
          {children}
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  accent,
  pad = 2,
}: {
  label: string;
  value: number;
  accent: string;
  pad?: number;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <CountUp
        value={value}
        padStart={pad}
        className="font-heading text-2xl md:text-3xl font-black"
        style={{ color: accent }}
      />
      <span className="text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-white/55">
        {label}
      </span>
    </div>
  );
}

function CornerBrackets({ accent }: { accent: string }) {
  const size = 40;
  const offset = 24;
  const stroke = 1;
  const style = {
    borderColor: `color-mix(in srgb, ${accent} 60%, transparent)`,
  } as React.CSSProperties;
  return (
    <div className="absolute inset-0 z-10 pointer-events-none hidden md:block">
      <span
        className="absolute"
        style={{
          top: offset,
          left: offset,
          width: size,
          height: size,
          borderTop: `${stroke}px solid`,
          borderLeft: `${stroke}px solid`,
          ...style,
        }}
      />
      <span
        className="absolute"
        style={{
          top: offset,
          right: offset,
          width: size,
          height: size,
          borderTop: `${stroke}px solid`,
          borderRight: `${stroke}px solid`,
          ...style,
        }}
      />
      <span
        className="absolute"
        style={{
          bottom: offset,
          left: offset,
          width: size,
          height: size,
          borderBottom: `${stroke}px solid`,
          borderLeft: `${stroke}px solid`,
          ...style,
        }}
      />
      <span
        className="absolute"
        style={{
          bottom: offset,
          right: offset,
          width: size,
          height: size,
          borderBottom: `${stroke}px solid`,
          borderRight: `${stroke}px solid`,
          ...style,
        }}
      />
    </div>
  );
}
