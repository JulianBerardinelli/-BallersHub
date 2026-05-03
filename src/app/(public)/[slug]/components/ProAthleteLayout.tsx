"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import type { PublicProfileData } from "./LayoutResolver";
import MinimalistLayout from "./MinimalistLayout";
import ProPlayerHeader from "./ProPlayerHeader";
import { formatMarketValueEUR, formatPlayerPositions } from "@/lib/format";

export default function ProAthleteLayout({ data, children }: { data: PublicProfileData, children?: React.ReactNode }) {
  const { player, career, theme } = data;
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const playerY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]); // Parallax hacia abajo principal
  const trailY1 = useTransform(scrollYProgress, [0, 1], ["0%", "150%"]);
  const trailY2 = useTransform(scrollYProgress, [0, 1], ["0%", "300%"]);
  const trailY3 = useTransform(scrollYProgress, [0, 1], ["0%", "500%"]);
  const trailY4 = useTransform(scrollYProgress, [0, 1], ["0%", "700%"]);
  const trailY5 = useTransform(scrollYProgress, [0, 1], ["0%", "1000%"]);
  const trailY6 = useTransform(scrollYProgress, [0, 1], ["0%", "1500%"]);

  if (!player.heroUrl) {
    return (
      <>
        <div className="w-full bg-red-500/10 text-red-500 text-center py-2 text-sm font-bold absolute top-0 z-50">
          [PRO LAYOUT]: Falta el Asset PNG (Cutout) de la portada. Mostrando Layout Minimalista.
        </div>
        <MinimalistLayout data={data} />
      </>
    );
  }

  const primaryColor = (theme?.primaryColor as string | null | undefined) || "#10b981";
  const secondaryColor = (theme?.secondaryColor as string | null | undefined) || "#2A2A2A";
  const accentColor = (theme?.accentColor as string | null | undefined) || "#34d399";
  const backgroundColor = (theme?.backgroundColor as string | null | undefined) || "#050505";

  const firstName = player.fullName.split(" ")[0] || "";
  const lastName = player.fullName.split(" ").slice(1).join(" ") || player.fullName;

  // Variantes para animaciones profesionales (caída rápida y agresiva)
  const nameVariants = {
    hidden: { x: -200, opacity: 0, skewX: 25, scale: 0.8, filter: "blur(15px)" },
    visible: { 
      x: 0, opacity: 1, skewX: 0, scale: 1, filter: "blur(0px)",
      transition: { type: "tween", duration: 0.5, ease: "easeOut", delay: 0.1 } as any
    }
  };

  const lastNameVariants = {
    hidden: { opacity: 0, scale: 1.2, filter: "blur(20px)" }, // Slam down
    visible: { 
      opacity: 1, scale: 1, filter: "blur(0px)",
      transition: { duration: 0.8, ease: "circOut", delay: 0.2 } as any
    }
  };

  return (
    <div 
      className="min-h-[300vh] text-white w-full flex flex-col items-center" 
      style={{ 
        backgroundColor: backgroundColor,
        '--theme-primary': primaryColor,
        '--theme-secondary': secondaryColor,
        '--theme-accent': accentColor,
        '--theme-background': backgroundColor
      } as React.CSSProperties} 
      ref={containerRef}
    >
      
      <ProPlayerHeader player={player} />

      {/* 
        ==================================================
        HERO SECTION (Cinematic ATMOSPHERE)
        ==================================================
      */}
      <section className="relative h-screen min-h-[850px] w-full flex items-center justify-center overflow-hidden">
        
        {/* Layer 0: Radial Dark Gradient & Ambient Color */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black/20 via-black to-black opacity-90" />
        
        {/* Layer 1: Texturas & Particulas Estáticas */}
        <div 
          className="absolute inset-0 z-0 mix-blend-overlay opacity-30 pointer-events-none" 
          style={{ backgroundImage: `url('/images/pack/particles/noise_2.jpg')`, backgroundSize: 'cover' }} 
        />
        <div 
          className="absolute inset-0 z-10 mix-blend-screen opacity-30 pointer-events-none" 
          style={{ backgroundImage: `url('/images/pack/particles/particle_1.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }} 
        />
        {/* Destellos simulados (si Leak existe) */}
        <div 
          className="absolute inset-0 z-10 mix-blend-screen opacity-40 pointer-events-none grayscale" 
          style={{ backgroundImage: `url('/images/pack/flares/light_leak_1.png')`, backgroundSize: 'cover', backgroundPosition: 'top right' }} 
        />
        
        {/* Color de acento reaccionando dinámicamente como luz */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px] opacity-20 pointer-events-none z-10 mix-blend-screen"
          style={{ backgroundColor: accentColor }}
        />

        {/* ======================= EFECTO SANDWICH (Z-INDEX MAGIC) ======================= */}

        {/* THE MARQUEE (Infinite scrolling background text) */}
        <div className="absolute z-10 overflow-hidden w-full h-full flex flex-col justify-center pointer-events-none select-none opacity-[0.12]">
          <motion.div 
            className="flex whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
          >
            {[...Array(4)].map((_, i) => (
              <span key={i} className="text-[25vw] font-black uppercase mx-8 leading-none [-webkit-text-stroke:1px_white] md:[-webkit-text-stroke:2px_white] text-transparent">
                {lastName} • {firstName} •
              </span>
            ))}
          </motion.div>
        </div>

        {/* 
          ======================================================================== 
          CAPA Z-40 (FRENTE): NOMBRE PEQUEÑO Y METADATOS 
          Alineación milimétrica: usamos un apellido invisible (w-fit) para que el
          contenedor herede el ancho exacto del apellido y podamos justificar 
          elementos perfectamente a sus bordes reales.
          ======================================================================== 
        */}
        <motion.div 
          className="absolute z-40 w-full flex flex-col justify-center items-center pointer-events-none select-none"
          style={{ y: textY }}
        >
          <div className="relative w-fit">
            
            {/* CABECERA FLOTANTE JUSTIFICADA */}
            <div className="absolute bottom-[90%] left-0 w-full flex justify-between items-end mb-2 md:mb-4">
              
              {/* NOMBRE PEQUEÑO (Alineado estrictamente a la izquierda) */}
              <motion.div 
                className="flex items-center gap-3 md:gap-5"
                initial="hidden" animate="visible" variants={nameVariants}
              >
                <div className="w-8 md:w-12 h-[2px] bg-white opacity-40 md:opacity-70" />
                <motion.div 
                  className="text-[clamp(1rem,3vw,1.8rem)] md:tracking-[0.4em] tracking-[0.2em] font-light uppercase text-white"
                  animate={{ 
                    opacity: [0.8, 1, 0.8],
                    textShadow: [
                      `0px 0px 10px ${accentColor}`,
                      `0px 0px 30px ${accentColor}, 0px 0px 60px #ffffff`,
                      `0px 0px 10px ${accentColor}`
                    ]
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  {firstName}
                </motion.div>
              </motion.div>

              {/* METADATOS (Alineado estrictamente a la derecha) */}
              <motion.div 
                className="flex items-center gap-2 md:gap-4 pb-[2px]"
                initial={{ opacity: 0, x: 50, filter: "blur(10px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 100, damping: 14, delay: 0.3 }}
              >
                {player.positions && player.positions.length > 0 && (
                  <div className="text-white tracking-[0.1em] md:tracking-[0.2em] uppercase font-bold text-[10px] md:text-sm lg:text-base opacity-95 drop-shadow-md">
                    {/* Toma la última posición después de filtrarla */}
                    {formatPlayerPositions(player.positions).split(" / ").pop()}
                  </div>
                )}
                
                {/* Separador estético circular */}
                {(player as any).nationalityCodes && ((player as any).nationalityCodes as string[]).length > 0 && player.positions?.length && player.positions?.length > 0 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white opacity-60 mx-1" />
                )}

                {/* Flags Container en fila (Sin Border Radius) */}
                {(player as any).nationalityCodes && ((player as any).nationalityCodes as string[]).length > 0 && (
                  <div className="flex items-center gap-2 drop-shadow-lg">
                    {((player as any).nationalityCodes as string[])?.slice(0, 3).map((code: string) => (
                      <span key={code} className={`fi fi-${code.toLowerCase()} text-base md:text-xl shadow-md bg-center`} style={{ borderRadius: "0" }} />
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* APELLIDO INVISIBLE (solo existe para expandir el flex al ancho milimétrico del apellido) */}
            <h1 className="font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter opacity-0 pointer-events-none select-none">
              {lastName}
            </h1>
          </div>
        </motion.div>

        {/* LAYER 1 GHOST TRAILS: GUM EFFECT SCROLL DOWN (6 LAYERS) */}
        <motion.div className="absolute z-15 w-full flex flex-col justify-center items-center pointer-events-none select-none mix-blend-screen" style={{ y: trailY6, opacity: 0.05 }}>
            <h1 className="font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-transparent w-full text-center [-webkit-text-stroke:1px_var(--theme-accent)]">{lastName}</h1>
        </motion.div>
        <motion.div className="absolute z-15 w-full flex flex-col justify-center items-center pointer-events-none select-none mix-blend-screen" style={{ y: trailY5, opacity: 0.1 }}>
            <h1 className="font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-transparent w-full text-center [-webkit-text-stroke:1px_var(--theme-accent)]">{lastName}</h1>
        </motion.div>
        <motion.div className="absolute z-15 w-full flex flex-col justify-center items-center pointer-events-none select-none mix-blend-screen" style={{ y: trailY4, opacity: 0.15 }}>
            <h1 className="font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-transparent w-full text-center [-webkit-text-stroke:1px_var(--theme-accent)] md:[-webkit-text-stroke:2px_var(--theme-accent)]">{lastName}</h1>
        </motion.div>
        <motion.div className="absolute z-15 w-full flex flex-col justify-center items-center pointer-events-none select-none mix-blend-screen" style={{ y: trailY3, opacity: 0.2 }}>
            <h1 className="font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-transparent w-full text-center [-webkit-text-stroke:1px_var(--theme-accent)] md:[-webkit-text-stroke:3px_var(--theme-accent)]">{lastName}</h1>
        </motion.div>
        <motion.div className="absolute z-15 w-full flex flex-col justify-center items-center pointer-events-none select-none mix-blend-screen" style={{ y: trailY2, opacity: 0.3 }}>
            <h1 className="font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-transparent w-full text-center [-webkit-text-stroke:1.5px_var(--theme-accent)] md:[-webkit-text-stroke:4px_var(--theme-accent)]">{lastName}</h1>
        </motion.div>
        <motion.div className="absolute z-15 w-full flex flex-col justify-center items-center pointer-events-none select-none mix-blend-screen" style={{ y: trailY1, opacity: 0.4 }}>
            <h1 className="font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-transparent w-full text-center [-webkit-text-stroke:2px_var(--theme-accent)] md:[-webkit-text-stroke:5px_var(--theme-accent)]">{lastName}</h1>
        </motion.div>

        {/* LAYER 1 NORMAL: TEXTO FRONT SOLIDO ESTÁTICO (Behind Player) */}
        <motion.div 
          className="absolute z-20 w-full flex flex-col justify-center items-center pointer-events-none select-none"
          style={{ y: textY }}
        >
          <motion.h1 
            initial="hidden" animate="visible" variants={lastNameVariants}
            className="font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-white drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center w-fit mx-auto"
          >
            {lastName}
          </motion.h1>
        </motion.div>

        {/* LAYER 2: CUTOUT PLAYER (PNG transparent) */}
        <motion.div 
          style={{ y: playerY }}
          initial={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute z-30 bottom-[-5vh] md:bottom-0 top-[15vh] w-full max-w-[1200px] flex justify-center items-end"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={player.heroUrl || undefined} 
            alt={player.fullName} 
            className="h-full w-auto object-contain object-bottom drop-shadow-[0_0_80px_rgba(0,0,0,0.8)] filter contrast-125"
          />
        </motion.div>

        {/* LAYER 3: OUTLINE TEXT LAYER (In front of Player) */}
        <motion.div 
          className="absolute z-40 w-full flex flex-col justify-center items-center pointer-events-none select-none"
          style={{ y: textY }}
        >
          <motion.h1 
            initial="hidden" animate="visible" variants={lastNameVariants}
            className="font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-center w-full [-webkit-text-stroke:1px_var(--theme-accent)] md:[-webkit-text-stroke:2px_var(--theme-accent)] text-transparent"
            style={{ 
              filter: `drop-shadow(0px 0px 20px ${accentColor}30)`
            }}
          >
            {lastName}
          </motion.h1>
        </motion.div>

        {/* Bottom Fade Gradient for smooth transition to sections */}
        <div 
          className="absolute bottom-0 w-full h-[30vh] z-40 pointer-events-none" 
          style={{ background: 'linear-gradient(to top, var(--theme-background) 5%, transparent 100%)' }} 
        />

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 text-white/50 flex flex-col items-center animate-bounce">
          <span className="text-[10px] tracking-[0.3em] uppercase mb-2">Scroll</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent" />
        </div>

      </section>
      {/* ======================================================== */}
      {/* SERVER COMPONENT MODULES (Suspense & Data Fetching)      */}
      {/* ======================================================== */}
      <div className="relative z-50 w-full min-h-screen pt-32 transition-colors duration-1000" style={{ backgroundColor: 'var(--theme-background)' }}>
        <div className="max-w-[1400px] w-full mx-auto px-6 md:px-12 flex flex-col gap-32">
          {children}
        </div>
      </div>

    </div>
  );
}
