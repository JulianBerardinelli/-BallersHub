"use client";

import { useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, ImagePlus } from "lucide-react";
import type { PublicProfileData } from "./LayoutResolver";
import ProPlayerHeader from "./ProPlayerHeader";
import { formatPlayerPositions } from "@/lib/format";

// Code-split the floating-video components: each pulls in a YouTube iframe +
// its own CSS, so we keep them out of the initial bundle. ssr:false keeps
// them out of SSR — both already return null on the server (they gate on
// useIsMobile, false on the server), so this only changes WHERE we skip the
// render, not whether. FloatingHeroVideo is the mobile morph header;
// HeroVideoIslandDesktop is the bottom-right island for desktop.
const FloatingHeroVideo = dynamic(() => import("./FloatingHeroVideo"), {
  ssr: false,
  loading: () => null,
});
const HeroVideoIslandDesktop = dynamic(
  () => import("./HeroVideoIslandDesktop"),
  { ssr: false, loading: () => null },
);

export default function ProAthleteLayout({ data, children }: { data: PublicProfileData, children?: React.ReactNode }) {
  const { player } = data;

  // Early-return BEFORE any hooks that depend on a DOM ref. `useScroll`
  // (below, in ProAthleteLayoutBody) throws "Target ref is defined but not
  // hydrated" when its target ref never attaches to a node — which is what
  // used to happen here when heroUrl was missing and we returned the
  // placeholder. Keeping the placeholder above the hook-using subcomponent
  // means useScroll only mounts in the branch where the ref actually exists.
  if (!player.heroUrl) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
        <div className="max-w-lg space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur md:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-bh-lime/30 bg-bh-lime/10 px-3 py-1 font-bh-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-bh-lime">
            <ImagePlus size={11} />
            Hero asset pendiente
          </span>
          <h2 className="font-bh-display text-2xl font-black uppercase leading-tight text-bh-fg-1 md:text-3xl">
            Subí tu recorte para activar la plantilla Pro
          </h2>
          <p className="text-sm leading-[1.6] text-bh-fg-3">
            La plantilla{" "}
            <span className="font-semibold text-bh-fg-1">Pro Athlete</span>{" "}
            necesita un PNG con tu silueta recortada para renderizar el hero
            cinemático. Cargalo desde la sección{" "}
            <span className="font-semibold text-bh-fg-1">Multimedia</span> del
            dashboard y tu perfil público se actualizará al instante. Si
            preferís publicar ya sin foto, podés cambiar a la plantilla{" "}
            <span className="font-semibold text-bh-fg-1">Free Editorial</span>{" "}
            desde Estilos.
          </p>
          <div className="flex flex-col items-center justify-center gap-2 pt-1 sm:flex-row sm:gap-3">
            <Link
              href="/dashboard/edit-profile/multimedia"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-bh-lime px-5 py-2.5 font-body text-sm font-semibold text-bh-black transition-colors hover:bg-[#d8ff26] sm:w-auto"
            >
              Ir a Multimedia
              <ArrowUpRight size={16} />
            </Link>
            <Link
              href="/dashboard/edit-template/styles"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 font-body text-sm font-semibold text-bh-fg-2 transition-colors hover:bg-white/[0.08] hover:text-bh-fg-1 sm:w-auto"
            >
              Cambiar a Free Editorial
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <ProAthleteLayoutBody data={data}>{children}</ProAthleteLayoutBody>;
}

function ProAthleteLayoutBody({ data, children }: { data: PublicProfileData, children?: React.ReactNode }) {
  const { player, theme, heroFloatingVideo } = data;
  const containerRef = useRef<HTMLDivElement>(null);
  const playerSlug = (player as { slug?: string | null }).slug ?? "";

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
      
      <ProPlayerHeader player={player} hideOnMobile={!!heroFloatingVideo} />

      {heroFloatingVideo && playerSlug && (
        <>
          {/* Mobile (<1024px): morph header that deploys the video. */}
          <FloatingHeroVideo
            video={heroFloatingVideo}
            slug={playerSlug}
            player={{ fullName: player.fullName, avatarUrl: player.avatarUrl ?? null }}
            accentColor={accentColor}
          />
          {/* Desktop (>=1024px): bottom-right floating island. Each component
              gates itself on viewport, so only one renders at a time. */}
          <HeroVideoIslandDesktop
            video={heroFloatingVideo}
            slug={playerSlug}
            accentColor={accentColor}
          />
        </>
      )}

      {/*
        ==================================================
        HERO SECTION (Cinematic ATMOSPHERE)
        ==================================================
      */}
      <section className="relative h-screen min-h-[850px] w-full flex items-center justify-center overflow-hidden">
        
        {/* Layer 0: Radial Dark Gradient & Ambient Color */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black/20 via-black to-black opacity-90" />
        
        {/* Layer 1: Texturas & Particulas — Estática (noise) + drift suave en
            partículas y light-leak para que el fondo respire sin distraer. */}
        <div
          className="absolute inset-0 z-0 mix-blend-overlay opacity-30 pointer-events-none"
          style={{ backgroundImage: `url('/images/pack/particles/noise_2.jpg')`, backgroundSize: 'cover' }}
        />
        <motion.div
          className="absolute inset-0 z-10 mix-blend-screen opacity-30 pointer-events-none"
          style={{ backgroundImage: `url('/images/pack/particles/particle_1.png')`, backgroundSize: '120% 120%', backgroundPosition: 'center', willChange: 'background-position' }}
          animate={{
            backgroundPosition: ['50% 50%', '52% 48%', '48% 52%', '50% 50%'],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Destellos / humo simulados — opacidad reducida + drift lento para
            que sume atmósfera sin tapar al jugador. */}
        <motion.div
          className="absolute inset-0 z-10 mix-blend-screen opacity-20 pointer-events-none grayscale"
          style={{ backgroundImage: `url('/images/pack/flares/light_leak_1.png')`, backgroundSize: '140% 140%', backgroundPosition: 'top right', willChange: 'background-position, opacity' }}
          animate={{
            opacity: [0.16, 0.24, 0.16],
            backgroundPosition: ['top right', '60% 20%', 'top right'],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
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
          className="absolute z-40 w-full flex flex-col justify-center items-start md:items-center pointer-events-none select-none pl-5 md:pl-0"
          style={{ y: textY }}
        >
          <div className="relative w-fit">

            {/*
              CABECERA FLOTANTE — Desktop: nombre a la izquierda + metadatos a la
              derecha en una sola línea, justificados al borde real del apellido.
              Mobile: como el asset pro vive a la derecha del viewport, el nombre
              y los metadatos se anclan a la izquierda (items-start) en una
              segunda línea bajo el nombre, evitando colisión con el cutout.
            */}
            <div className="absolute bottom-[90%] left-0 w-full flex flex-col md:flex-row md:justify-between md:items-end items-start gap-1.5 md:gap-0 mb-2 md:mb-4">

              {/* NOMBRE PEQUEÑO — orden invertido en mobile (queda debajo de
                  los metadatos para que "CENTRODELANTERO + flags" lidere la
                  cabecera). Desktop conserva el orden natural (nombre a la
                  izquierda, metadatos a la derecha del apellido). */}
              <motion.div
                className="flex items-center gap-3 md:gap-5 order-2 md:order-none"
                initial="hidden" animate="visible" variants={nameVariants}
              >
                <div className="w-6 md:w-12 h-[2px] bg-white opacity-40 md:opacity-70" />
                <motion.div
                  className="text-[clamp(0.95rem,3.6vw,1.8rem)] tracking-[0.18em] md:tracking-[0.4em] font-light uppercase text-white whitespace-nowrap"
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

              {/* METADATOS: posición + flags. En mobile bajan a línea propia. */}
              <motion.div
                className="flex items-center gap-2 md:gap-4 pb-[2px] max-w-full"
                initial={{ opacity: 0, x: 50, filter: "blur(10px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 100, damping: 14, delay: 0.3 }}
              >
                {player.positions && player.positions.length > 0 && (
                  <div className="text-white tracking-[0.1em] md:tracking-[0.2em] uppercase font-bold text-[10px] md:text-sm lg:text-base opacity-95 drop-shadow-md whitespace-nowrap">
                    {/* Toma la última posición después de filtrarla */}
                    {formatPlayerPositions(player.positions).split(" / ").pop()}
                  </div>
                )}

                {/* Separador estético circular */}
                {(player as any).nationalityCodes && ((player as any).nationalityCodes as string[]).length > 0 && player.positions?.length && player.positions?.length > 0 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white opacity-60 mx-0.5 md:mx-1" />
                )}

                {/* Flags Container en fila (Sin Border Radius) */}
                {(player as any).nationalityCodes && ((player as any).nationalityCodes as string[]).length > 0 && (
                  <div className="flex items-center gap-1.5 md:gap-2 drop-shadow-lg">
                    {((player as any).nationalityCodes as string[])?.slice(0, 3).map((code: string) => (
                      <span key={code} className={`fi fi-${code.toLowerCase()} text-sm md:text-xl shadow-md bg-center`} style={{ borderRadius: "0" }} />
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/*
              APELLIDO INVISIBLE — width spacer only. Was previously an
              <h1>, which caused multiple H1s on the page (the layer
              below also renders one). Changed to a <span> with
              role="presentation" so it stays out of the accessibility
              tree and the semantic outline.
            */}
            <span
              role="presentation"
              aria-hidden="true"
              className="block font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter opacity-0 pointer-events-none select-none"
            >
              {lastName}
            </span>
          </div>
        </motion.div>

        {/*
          LAYER 1 GHOST TRAILS — purely decorative. These were originally
          six <h1> elements which counted as H1 spam to crawlers (one
          page should have a single H1). Changed to aria-hidden spans
          rendered as blocks so the parallax animation is preserved
          visually but the semantic outline stays clean.
        */}
        {/* Ghost trails — grosores afinados + paint-order stroke fill para
            evitar las intersecciones cruzadas del webkit-text-stroke en letras
            con curvas internas (B, R, Ä, …). */}
        <motion.div className="absolute z-15 w-full flex flex-col justify-center items-start md:items-center pointer-events-none select-none mix-blend-screen pl-5 md:pl-0" style={{ y: trailY6, opacity: 0.05 }}>
            <span aria-hidden="true" className="block font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-transparent w-fit md:w-full text-left md:text-center" style={{ WebkitTextStroke: "1px var(--theme-accent)", paintOrder: "stroke fill" }}>{lastName}</span>
        </motion.div>
        <motion.div className="absolute z-15 w-full flex flex-col justify-center items-start md:items-center pointer-events-none select-none mix-blend-screen pl-5 md:pl-0" style={{ y: trailY5, opacity: 0.1 }}>
            <span aria-hidden="true" className="block font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-transparent w-fit md:w-full text-left md:text-center" style={{ WebkitTextStroke: "1px var(--theme-accent)", paintOrder: "stroke fill" }}>{lastName}</span>
        </motion.div>
        <motion.div className="absolute z-15 w-full flex flex-col justify-center items-start md:items-center pointer-events-none select-none mix-blend-screen pl-5 md:pl-0" style={{ y: trailY4, opacity: 0.15 }}>
            <span aria-hidden="true" className="block font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-transparent w-fit md:w-full text-left md:text-center" style={{ WebkitTextStroke: "1px var(--theme-accent)", paintOrder: "stroke fill" }}>{lastName}</span>
        </motion.div>
        <motion.div className="absolute z-15 w-full flex flex-col justify-center items-start md:items-center pointer-events-none select-none mix-blend-screen pl-5 md:pl-0" style={{ y: trailY3, opacity: 0.2 }}>
            <span aria-hidden="true" className="block font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-transparent w-fit md:w-full text-left md:text-center" style={{ WebkitTextStroke: "1.25px var(--theme-accent)", paintOrder: "stroke fill" }}>{lastName}</span>
        </motion.div>
        <motion.div className="absolute z-15 w-full flex flex-col justify-center items-start md:items-center pointer-events-none select-none mix-blend-screen pl-5 md:pl-0" style={{ y: trailY2, opacity: 0.28 }}>
            <span aria-hidden="true" className="block font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-transparent w-fit md:w-full text-left md:text-center" style={{ WebkitTextStroke: "1.25px var(--theme-accent)", paintOrder: "stroke fill" }}>{lastName}</span>
        </motion.div>
        <motion.div className="absolute z-15 w-full flex flex-col justify-center items-start md:items-center pointer-events-none select-none mix-blend-screen pl-5 md:pl-0" style={{ y: trailY1, opacity: 0.35 }}>
            <span aria-hidden="true" className="block font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-transparent w-fit md:w-full text-left md:text-center" style={{ WebkitTextStroke: "1.5px var(--theme-accent)", paintOrder: "stroke fill" }}>{lastName}</span>
        </motion.div>

        {/*
          LAYER STACK (back → front):
            z-15 : ghost-trail outlines (parallax decoration above)
            z-20 : WHITE-SOLID title  (back text)
            z-30 : CUTOUT PLAYER image (middle)
            z-35 : ACCENT-OUTLINE title (front text — overlaps player)
            z-40 : bottom transition gradient (below)

          The white solid sits behind the player, and the accent outline
          sits IN FRONT of the player so the silhouette of each letter
          frames the player from the foreground. The interior contours
          of letters (the inside strokes of `B`, `A`, `N`, etc.) are
          visible in this configuration — by design.
        */}

        {/* LAYER 1 — WHITE-SOLID title (back). Page's single canonical <h1>.
            Crawlers read `${firstName} ${lastName}` via the .sr-only span;
            users see `${lastName}` rendered huge. `aria-label` makes screen
            readers announce the full name in one phrase. */}
        <motion.div
          className="absolute z-20 w-full flex flex-col justify-center items-start md:items-center pointer-events-none select-none pl-5 md:pl-0"
          style={{ y: textY }}
        >
          <motion.h1
            initial="hidden" animate="visible" variants={lastNameVariants}
            aria-label={player.fullName}
            className="font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-white drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-left md:text-center w-fit md:mx-auto"
          >
            <span className="sr-only">{firstName} </span>
            <span aria-hidden="true">{lastName}</span>
          </motion.h1>
        </motion.div>

        {/* LAYER 2 — CUTOUT PLAYER (PNG transparent), middle of the stack.
            Mobile: lo subimos (top más alto y bottom negativo más alto para
            que crezca) y le damos un leve scale + un push fuerte a la derecha
            para que el jugador "se asome" desde el costado sin pisar el
            nombre/apellido centrados, manteniendo `overflow-hidden` del padre
            para que NUNCA genere scroll horizontal.
            Desktop: se mantiene la configuración original. */}
        <motion.div
          style={{ y: playerY }}
          initial={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute z-30 bottom-[-2vh] md:bottom-0 top-[8vh] md:top-[15vh] w-full max-w-[1200px] flex justify-center items-end"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* Mobile: fixed bottom-anchored box (consistent footprint across
              profiles regardless of the source PNG's aspect). We dropped the
              old `h-full scale-[1.18]` (~111vh, overflowed under the header and
              read as "exageradamente grande"). Now a capped 92vh box, feet on
              the baseline. Desktop (md:) keeps the original h-full / scale-100. */}
          <img
            src={player.heroUrl || undefined}
            alt={player.fullName}
            className="h-[92vh] max-h-[840px] md:h-full md:max-h-none w-auto object-contain object-bottom drop-shadow-[0_0_80px_rgba(0,0,0,0.8)] filter contrast-125 md:scale-100 origin-bottom translate-x-[14%] md:translate-x-0"
          />
        </motion.div>

        {/* LAYER 3 — ACCENT-OUTLINE title (front). Tinted con el `--theme-accent`
            del player y dibujado en FRENTE del PNG para que el contorno envuelva
            la silueta. Se usa `paint-order: stroke fill` + grosores finos para
            que los trazos no se intersecten dentro de la letra (que era lo que
            producía los "cortes" feos en el border anterior). */}
        <motion.div
          className="absolute z-[35] w-full flex flex-col justify-center items-start md:items-center pointer-events-none select-none pl-5 md:pl-0"
          style={{ y: textY }}
        >
          <motion.span
            initial="hidden" animate="visible" variants={lastNameVariants}
            aria-hidden="true"
            className="block font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-left md:text-center w-fit md:w-full text-transparent"
            style={{
              WebkitTextStroke: `1.5px ${accentColor}`,
              paintOrder: "stroke fill",
              filter: `drop-shadow(0px 0px 20px ${accentColor}40)`,
            }}
          >
            {lastName}
          </motion.span>
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
