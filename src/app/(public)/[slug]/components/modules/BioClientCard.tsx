"use client";

import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from "framer-motion";
import React from "react";
import Image from "next/image";
import CountryFlag from "@/components/common/CountryFlag";
import TransfermarktIcon from "@/components/icons/TransfermarktIcon";
import { Instagram } from "@/components/icons/InstagramIcon";
import { LinkedIn } from "@/components/icons/LinkedInIcon";
import { Youtube } from "lucide-react";
import { BlockReveal } from "@/components/common/animations/BlockReveal";
import { ScrambleText } from "@/components/common/animations/ScrambleText";
import { Variants } from "framer-motion";

const itemVariant: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

export default function BioClientCard({ data, player, teamCrest, teamCountryCode, division, socialLinks }: { data: Record<string, any> | null | undefined, player: Record<string, any>, teamCrest?: string | null, teamCountryCode?: string | null, division?: string | null, socialLinks?: Record<string, any>[] }) {
  // Configuración del efecto 3D Tilt (Magnetic Card)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Springs for smooth rotation
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

  // Mouse absolute position for the radial gradient flare (0 to 100%)
  const mouseXAbs = useMotionValue(50);
  const mouseYAbs = useMotionValue(50);
  // Color radial dinámico basado en la paleta del jugador (usa theme-primary mezclado con transparencia)
  const bgGradient = useMotionTemplate`radial-gradient(circle at ${mouseXAbs}% ${mouseYAbs}%, color-mix(in srgb, var(--theme-primary) 15%, transparent) 0%, transparent 60%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // For 3D Tilt (-0.5 to 0.5)
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);

    // For Glow Effect (0 to 100)
    mouseXAbs.set((mouseX / width) * 100);
    mouseYAbs.set((mouseY / height) * 100);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    mouseXAbs.set(50);
    mouseYAbs.set(50);
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '--';
    const dob = new Date(birthDate);
    const diff = Date.now() - dob.getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  return (
    <section id="biography" className="relative w-full py-10 flex flex-col lg:flex-row items-start gap-16">
      
      {/* PRESENTATION (LEFT SIDE) */}
      <motion.div 
         initial="hidden"
         whileInView="visible"
         viewport={{ once: true, margin: "-50px" }}
         variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
         }}
         className="lg:w-5/12 flex flex-col space-y-6 pt-4"
      >
         <motion.div variants={itemVariant} className="flex items-center gap-6">
            <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-white/10 shrink-0">
               <Image 
                 src={player.avatarUrl || '/images/player-default.jpg'} 
                 alt={player.fullName || 'Player Avatar'} 
                 fill
                 className="object-cover"
               />
            </div>
            <div>
               <BlockReveal blockColor="var(--theme-primary)" delay={0.1}>
                 <h3 className="text-3xl md:text-5xl font-heading font-black leading-[0.9] uppercase text-white pb-1">
                    {player.fullName?.replace(" ", "\n").split("\n").map((part: string, i: number) => (
                       <React.Fragment key={i}>{part}<br/></React.Fragment>
                    ))}
                 </h3>
               </BlockReveal>
               
               <div className="flex items-center gap-3 mt-4">
                 <span className="text-white/60 font-bold uppercase tracking-widest text-sm">
                   <ScrambleText text={player.positions?.join(" / ") || "N/A"} delay={0.3} />
                 </span>
                 {player.nationalityCodes?.length > 0 && (
                   <div className="flex items-center gap-2 border-l border-white/20 pl-3">
                     {player.nationalityCodes.map((code: string, i: number) => (
                       <CountryFlag key={i} code={code} className="w-5 h-5 rounded-sm object-cover" />
                     ))}
                   </div>
                 )}
               </div>
            </div>
         </motion.div>

         <motion.div variants={itemVariant} className="flex flex-wrap gap-2 w-full mt-2">
           {player.transfermarktUrl && (
             <a href={player.transfermarktUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 group px-3 py-1.5 rounded-full border border-[#1a3151] text-[#6b9ae6] bg-black/40 shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:bg-[#1a3151] hover:text-white transition-all backdrop-blur-md">
               <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                 <TransfermarktIcon />
               </div>
               <span className="text-[10px] font-bold uppercase tracking-widest">Transfermarkt</span>
             </a>
           )}
           {player.beSoccerUrl && (
             <a href={player.beSoccerUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 group px-3 py-1.5 rounded-full border border-[#00e676]/40 text-[#00e676] bg-black/40 shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:bg-[#00e676] hover:text-black transition-all backdrop-blur-md">
               <div className="w-4 h-4 shrink-0 flex items-center justify-center font-black text-[10px] bg-current text-white group-hover:text-[#00e676] rounded-sm">
                 BS
               </div>
               <span className="text-[10px] font-bold uppercase tracking-widest">BeSoccer</span>
             </a>
           )}
           {socialLinks?.find((l: any) => l.kind.toLowerCase() === 'instagram') && (
             <a href={socialLinks.find((l: any) => l.kind.toLowerCase() === 'instagram')!.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 group px-3 py-1.5 rounded-full border border-[#E1306C]/40 text-[#E1306C] bg-black/40 shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:bg-[#E1306C] hover:text-white transition-all backdrop-blur-md stroke-current fill-current">
               <div className="w-4 h-4 shrink-0 flex items-center justify-center text-current">
                 <Instagram className="w-full h-full" />
               </div>
               <span className="text-[10px] font-bold uppercase tracking-widest">Instagram</span>
             </a>
           )}
           {socialLinks?.find((l: any) => l.kind.toLowerCase() === 'linkedin') && (
             <a href={socialLinks.find((l: any) => l.kind.toLowerCase() === 'linkedin')!.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 group px-3 py-1.5 rounded-full border border-[#0A66C2]/40 text-[#0A66C2] bg-black/40 shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:bg-[#0A66C2] hover:text-white transition-all backdrop-blur-md stroke-current fill-current">
               <div className="w-4 h-4 shrink-0 flex items-center justify-center text-current">
                 <LinkedIn className="w-full h-full" fill="currentColor" />
               </div>
               <span className="text-[10px] font-bold uppercase tracking-widest">LinkedIn</span>
             </a>
           )}
           {socialLinks?.find((l: any) => l.kind.toLowerCase() === 'youtube') && (
             <a href={socialLinks.find((l: any) => l.kind.toLowerCase() === 'youtube')!.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 group px-3 py-1.5 rounded-full border border-[#FF0000]/40 text-[#FF0000] bg-black/40 shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:bg-[#FF0000] hover:text-white transition-all backdrop-blur-md stroke-current fill-current">
               <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                 <Youtube className="w-full h-full" />
               </div>
               <span className="text-[10px] font-bold uppercase tracking-widest">YouTube</span>
             </a>
           )}
         </motion.div>

         <motion.div variants={itemVariant} className="flex items-center gap-4 mt-4 mb-4">
           <h4 className="uppercase tracking-[0.2em] text-[10px] font-bold whitespace-nowrap shrink-0" style={{ color: "var(--theme-accent)" }}>
             <ScrambleText text="MINDSET & BIO" delay={0.1} />
           </h4>
           <div className="h-[1px] w-full" style={{ background: "color-mix(in srgb, var(--theme-secondary) 50%, transparent)" }} />
         </motion.div>

         <motion.div variants={itemVariant}>
           <p className="text-white/80 font-body text-base leading-relaxed mix-blend-lighten max-w-lg block">
             {player.bio || "Buscando información biográfica confidencial..."}
           </p>
         </motion.div>
      </motion.div>

      {/* TARJETA INTERACTIVA DE DATOS DUROS (RIGHT SIDE) */}
      <div className="lg:w-7/12 perspective-1000 w-full">
        <motion.div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ rotateX, rotateY, transformStyle: "preserve-3d", border: "1px solid color-mix(in srgb, var(--theme-secondary) 40%, transparent)" }}
          className="relative w-full rounded-[2.5rem] bg-neutral-900/40 overflow-hidden shadow-2xl backdrop-blur-[20px] min-h-[400px]"
        >
          {/* DYNAMIC FLARE LIGHT EFFECT REACTING TO MOUSE (No square image bounds!) */}
          <motion.div 
            className="absolute inset-0 z-0 pointer-events-none mix-blend-screen"
            style={{ background: bgGradient }}
          />

          <div className="relative z-20 p-8 md:p-14 h-full flex flex-col justify-between" style={{ transform: "translateZ(30px)" }}>             <div className="grid grid-cols-2 gap-x-8 gap-y-12">
               {/* Dato: Edad / Nacimiento */}
               <div className="border-l-[3px] pl-5 transition-colors" style={{ borderColor: 'color-mix(in srgb, var(--theme-secondary) 40%, transparent)' }}>
                 <span className="block text-[11px] tracking-[0.2em] font-black uppercase mb-2" style={{ color: 'var(--theme-accent)' }}>
                   <ScrambleText text="Edad" delay={0.1} />
                 </span>
                 <span className="text-3xl md:text-4xl font-black text-white leading-none">
                    <ScrambleText text={String(calculateAge(player.birthDate))} delay={0.2} /> <span className="text-xl text-white/30 uppercase"><ScrambleText text="Años" delay={0.25} /></span>
                 </span>
                 <span className="block text-white/60 mt-2 text-sm uppercase tracking-widest"><ScrambleText text={player.birthDate || '--'} delay={0.3} /></span>
               </div>

               {/* Dato: Altura / Peso */}
               <div className="border-l-[3px] pl-5 transition-colors" style={{ borderColor: 'color-mix(in srgb, var(--theme-secondary) 40%, transparent)' }}>
                 <span className="block text-[11px] tracking-[0.2em] font-black uppercase mb-2" style={{ color: 'var(--theme-accent)' }}>
                   <ScrambleText text="Físico" delay={0.15} />
                 </span>
                 <div className="flex gap-4">
                    <span className="text-3xl md:text-4xl font-black text-white leading-none">
                       <ScrambleText text={String(player.heightCm || '--')} delay={0.3} /><span className="text-xl text-white/30 uppercase"><ScrambleText text="cm" delay={0.35} /></span>
                    </span>
                    <span className="text-3xl md:text-4xl font-black text-white leading-none">
                       <ScrambleText text={String(player.weightKg || '--')} delay={0.4} /><span className="text-xl text-white/30 uppercase"><ScrambleText text="kg" delay={0.45} /></span>
                    </span>
                 </div>
                 <span className="block text-white/60 mt-2 text-sm uppercase tracking-widest">
                   <ScrambleText text={player.foot ? `PIE ${player.foot}` : '--'} delay={0.5} />
                 </span>
               </div>

               {/* Dato: Club Actual (con logo y división) */}
               <div className="border-l-[3px] pl-5 flex flex-col gap-2 transition-colors col-span-2 md:col-span-1" style={{ borderColor: 'color-mix(in srgb, var(--theme-secondary) 40%, transparent)' }}>
                 <span className="block text-[11px] tracking-[0.2em] font-black uppercase" style={{ color: 'var(--theme-accent)' }}>
                   <ScrambleText text="Club Actual" delay={0.2} />
                 </span>
                 <div className="flex items-center gap-4 mt-2">
                   {teamCrest && (
                     <div className="relative w-10 h-10 md:w-12 md:h-12 shrink-0">
                        <Image src={teamCrest} alt="Team Logo" fill className="object-contain drop-shadow-xl" />
                     </div>
                   )}
                   <div className="flex flex-col justify-center">
                     <span className="text-xl md:text-2xl font-bold text-white uppercase break-words block leading-tight">
                       <ScrambleText text={player.currentClub || 'AGENTE LIBRE'} delay={0.5} />
                     </span>
                     <div className="flex items-center gap-2 mt-0.5">
                       {player.currentClub && teamCountryCode && (
                         <CountryFlag code={teamCountryCode} className="w-5 h-4 rounded-[2px] object-cover drop-shadow-md" />
                       )}
                       {player.currentClub && division && (
                         <span className="block text-white/60 text-xs uppercase font-bold tracking-widest">
                           <ScrambleText text={division} delay={0.55} />
                         </span>
                       )}
                     </div>
                   </div>
                 </div>
               </div>

               {/* Dato: Pasaporte / Ciudadano */}
               <div className="border-l-[3px] pl-5 transition-colors" style={{ borderColor: 'color-mix(in srgb, var(--theme-secondary) 40%, transparent)' }}>
                 <span className="block text-[11px] tracking-[0.2em] font-black uppercase mb-2" style={{ color: 'var(--theme-accent)' }}>
                   <ScrambleText text="Pasaporte" delay={0.25} />
                 </span>
                 <div className="flex flex-col">
                   <div className="flex items-center gap-3">
                     <span className="text-sm md:text-base font-bold text-white/80 uppercase tracking-widest">
                       <ScrambleText text="Ciudadano" delay={0.35} />
                     </span>
                     <div className="flex items-center gap-2 border-l-[2px] border-white/20 pl-3">
                       {player.nationalityCodes?.length > 0 ? (
                         player.nationalityCodes.map((code: string, i: number) => (
                           <CountryFlag key={i} code={code} className="w-8 h-6 md:w-9 md:h-6 rounded-sm object-cover drop-shadow-md" />
                         ))
                       ) : (
                         <span className="text-white/60">--</span>
                       )}
                     </div>
                   </div>
                   {(data?.residenceCity || data?.residenceCountry) && (
                     <div className="mt-3 block text-white/50 text-[10px] md:text-xs uppercase font-light tracking-widest leading-tight">
                       <ScrambleText text="Actualmente rsd. en" delay={0.4} />
                       <span className="block mt-1 text-white font-black text-sm md:text-base drop-shadow-md">
                         <ScrambleText text={`${data?.residenceCity || "N/A"}${data?.residenceCountry ? `, ${data?.residenceCountry}` : ''}`} delay={0.6} />
                       </span>
                     </div>
                   )}
                 </div>
               </div>

               {/* Dato: Idiomas */}
               <div className="border-l-[3px] pl-5 transition-colors" style={{ borderColor: 'color-mix(in srgb, var(--theme-secondary) 40%, transparent)' }}>
                 <span className="block text-[11px] tracking-[0.2em] font-black uppercase mb-2" style={{ color: 'var(--theme-accent)' }}>
                   <ScrambleText text="Idiomas" delay={0.3} />
                 </span>
                 <span className="text-lg md:text-xl font-bold text-white uppercase tracking-widest break-words leading-tight block">
                   <ScrambleText text={data?.languages?.join(", ") || '--'} delay={0.6} />
                 </span>
               </div>

               {/* Dato: Formación / Estudios */}
               <div className="border-l-[3px] pl-5 transition-colors" style={{ borderColor: 'color-mix(in srgb, var(--theme-secondary) 40%, transparent)' }}>
                 <span className="block text-[11px] tracking-[0.2em] font-black uppercase mb-2" style={{ color: 'var(--theme-accent)' }}>
                   <ScrambleText text="Educación" delay={0.35} />
                 </span>
                 <span className="text-lg md:text-xl font-bold text-white uppercase tracking-widest break-words leading-tight block">
                   <ScrambleText text={data?.education || '--'} delay={0.7} />
                 </span>
               </div>
            </div>

          </div>

          <div className="absolute top-6 right-8 text-white/[0.03] font-heading font-black text-8xl pointer-events-none select-none" style={{ transform: "translateZ(-10px)" }}>
            <ScrambleText text="BIO" delay={0.2} />
          </div>

        </motion.div>
      </div>

    </section>
  );
}
