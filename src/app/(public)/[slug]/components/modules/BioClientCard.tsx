"use client";

import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from "framer-motion";
import React from "react";
import Image from "next/image";
import CountryFlag from "@/components/common/CountryFlag";
import TransfermarktIcon from "@/components/icons/TransfermarktIcon";
import { Instagram } from "@/components/icons/InstagramIcon";
import { LinkedIn } from "@/components/icons/LinkedInIcon";
import { Youtube } from "lucide-react";

export default function BioClientCard({ data, player, teamCrest, division, socialLinks }: { data: Record<string, any> | null | undefined, player: Record<string, any>, teamCrest?: string | null, division?: string | null, socialLinks?: any[] }) {
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
      <div className="lg:w-5/12 flex flex-col space-y-6 pt-4">
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           className="flex items-center gap-6"
         >
            <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-white/10 shrink-0">
               <Image 
                 src={player.avatarUrl || '/images/player-default.jpg'} 
                 alt={player.fullName || 'Player Avatar'} 
                 fill
                 className="object-cover"
               />
            </div>
            <div>
               <h3 className="text-3xl md:text-5xl font-heading font-black leading-[0.9] uppercase text-white">
                  {player.fullName?.replace(" ", "\n").split("\n").map((part: string, i: number) => (
                     <React.Fragment key={i}>{part}<br/></React.Fragment>
                  ))}
               </h3>
               
               <div className="flex items-center gap-3 mt-4">
                 <span className="text-white/60 font-bold uppercase tracking-widest text-sm">
                   {player.positions?.join(" / ") || "N/A"}
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

         <div className="flex flex-wrap gap-2 w-full mt-2">
           {player.transfermarktUrl && (
             <a href={player.transfermarktUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 group px-3 py-1.5 rounded-full border border-[#1a3151] text-[#6b9ae6] hover:bg-[#1a3151] hover:text-white transition-all backdrop-blur-md">
               <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                 <TransfermarktIcon />
               </div>
               <span className="text-[10px] font-bold uppercase tracking-widest">Transfermarkt <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">↗</span></span>
             </a>
           )}
           {player.beSoccerUrl && (
             <a href={player.beSoccerUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 group px-3 py-1.5 rounded-full border border-[#00e676]/40 text-[#00e676] hover:bg-[#00e676] hover:text-black transition-all backdrop-blur-md">
               <div className="w-4 h-4 shrink-0 flex items-center justify-center font-black text-[10px] bg-current text-white group-hover:text-[#00e676] rounded-sm">
                 BS
               </div>
               <span className="text-[10px] font-bold uppercase tracking-widest">BeSoccer <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">↗</span></span>
             </a>
           )}
           {socialLinks?.find((l: any) => l.kind.toLowerCase() === 'instagram') && (
             <a href={socialLinks.find((l: any) => l.kind.toLowerCase() === 'instagram').url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 group px-3 py-1.5 rounded-full border border-[#E1306C]/40 text-[#E1306C] hover:bg-[#E1306C] hover:text-white transition-all backdrop-blur-md stroke-current fill-current">
               <div className="w-4 h-4 shrink-0 flex items-center justify-center text-current">
                 <Instagram className="w-full h-full" />
               </div>
               <span className="text-[10px] font-bold uppercase tracking-widest">Instagram <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">↗</span></span>
             </a>
           )}
           {socialLinks?.find((l: any) => l.kind.toLowerCase() === 'linkedin') && (
             <a href={socialLinks.find((l: any) => l.kind.toLowerCase() === 'linkedin').url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 group px-3 py-1.5 rounded-full border border-[#0A66C2]/40 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white transition-all backdrop-blur-md stroke-current fill-current">
               <div className="w-4 h-4 shrink-0 flex items-center justify-center text-current">
                 <LinkedIn className="w-full h-full" fill="currentColor" />
               </div>
               <span className="text-[10px] font-bold uppercase tracking-widest">LinkedIn <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">↗</span></span>
             </a>
           )}
           {socialLinks?.find((l: any) => l.kind.toLowerCase() === 'youtube') && (
             <a href={socialLinks.find((l: any) => l.kind.toLowerCase() === 'youtube').url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 group px-3 py-1.5 rounded-full border border-[#FF0000]/40 text-[#FF0000] hover:bg-[#FF0000] hover:text-white transition-all backdrop-blur-md stroke-current fill-current">
               <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                 <Youtube className="w-full h-full" />
               </div>
               <span className="text-[10px] font-bold uppercase tracking-widest">YouTube <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">↗</span></span>
             </a>
           )}
         </div>

         <motion.hr 
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            className="origin-left mt-2"
            style={{ borderTop: "1px solid color-mix(in srgb, var(--theme-secondary) 50%, transparent)" }}
         />

         <motion.div 
           initial={{ opacity: 0 }} 
           whileInView={{ opacity: 1 }} 
           transition={{ delay: 0.2 }}
         >
           <h4 className="uppercase tracking-[0.2em] text-[10px] font-bold mb-4" style={{ color: "var(--theme-accent)" }}>MINDSET & BIO</h4>
           <p className="text-white/80 font-body text-base leading-relaxed mix-blend-lighten max-w-lg">
             {player.bio || "Buscando información biográfica confidencial..."}
           </p>
         </motion.div>
      </div>

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

          <div className="relative z-20 p-8 md:p-14 h-full flex flex-col justify-between" style={{ transform: "translateZ(30px)" }}>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-12">
               {/* Dato: Edad / Nacimiento */}
               <div className="border-l-[3px] pl-5 transition-colors" style={{ borderColor: 'color-mix(in srgb, var(--theme-secondary) 40%, transparent)' }}>
                 <span className="block text-[11px] tracking-[0.2em] font-black uppercase mb-2" style={{ color: 'var(--theme-accent)' }}>Edad</span>
                 <span className="text-3xl md:text-4xl font-black text-white leading-none">
                    {calculateAge(player.birthDate)} <span className="text-xl text-white/30 uppercase">Años</span>
                 </span>
                 <span className="block text-white/60 mt-2 text-sm uppercase tracking-widest">{player.birthDate || '--'}</span>
               </div>

               {/* Dato: Altura / Peso */}
               <div className="border-l-[3px] pl-5 transition-colors" style={{ borderColor: 'color-mix(in srgb, var(--theme-secondary) 40%, transparent)' }}>
                 <span className="block text-[11px] tracking-[0.2em] font-black uppercase mb-2" style={{ color: 'var(--theme-accent)' }}>Físico</span>
                 <div className="flex gap-4">
                    <span className="text-3xl md:text-4xl font-black text-white leading-none">
                       {player.heightCm || '--'}<span className="text-xl text-white/30 uppercase">cm</span>
                    </span>
                    <span className="text-3xl md:text-4xl font-black text-white leading-none">
                       {player.weightKg || '--'}<span className="text-xl text-white/30 uppercase">kg</span>
                    </span>
                 </div>
                 <span className="block text-white/60 mt-2 text-sm uppercase tracking-widest">{player.foot ? `PIE ${player.foot}` : '--'}</span>
               </div>

               {/* Dato: Club Actual (con logo y división) */}
               <div className="border-l-[3px] pl-5 flex flex-col gap-2 transition-colors col-span-2 md:col-span-1" style={{ borderColor: 'color-mix(in srgb, var(--theme-secondary) 40%, transparent)' }}>
                 <span className="block text-[11px] tracking-[0.2em] font-black uppercase" style={{ color: 'var(--theme-accent)' }}>Club Actual</span>
                 <div className="flex items-center gap-4 mt-2">
                   {teamCrest && (
                     <div className="relative w-10 h-10 md:w-12 md:h-12 shrink-0">
                        <Image src={teamCrest} alt="Team Logo" fill className="object-contain drop-shadow-xl" />
                     </div>
                   )}
                   <div className="flex flex-col justify-center">
                     <span className="text-xl md:text-2xl font-bold text-white uppercase break-words block leading-tight">
                       {player.currentClub || 'AGENTE LIBRE'}
                     </span>
                     {division && (
                       <span className="block text-white/60 mt-0.5 text-xs uppercase font-bold tracking-widest">{division}</span>
                     )}
                   </div>
                 </div>
               </div>

               {/* Dato: Pasaporte / Residencia */}
               <div className="border-l-[3px] pl-5 transition-colors" style={{ borderColor: 'color-mix(in srgb, var(--theme-secondary) 40%, transparent)' }}>
                 <span className="block text-[11px] tracking-[0.2em] font-black uppercase mb-2" style={{ color: 'var(--theme-accent)' }}>Pasaporte</span>
                 <span className="text-2xl font-bold text-white uppercase tracking-widest">{data?.documentCountry || '--'}</span>
                 <span className="block text-white/60 mt-2 text-xs uppercase tracking-widest">
                   {data?.residenceCity || "N/A"}{data?.residenceCountry ? `, ${data?.residenceCountry}` : ''}
                 </span>
               </div>

               {/* Dato: Idiomas */}
               <div className="border-l-[3px] pl-5 transition-colors" style={{ borderColor: 'color-mix(in srgb, var(--theme-secondary) 40%, transparent)' }}>
                 <span className="block text-[11px] tracking-[0.2em] font-black uppercase mb-2" style={{ color: 'var(--theme-accent)' }}>Idiomas</span>
                 <span className="text-lg md:text-xl font-bold text-white uppercase tracking-widest break-words leading-tight block">
                   {data?.languages?.join(", ") || '--'}
                 </span>
               </div>

               {/* Dato: Formación / Estudios */}
               <div className="border-l-[3px] pl-5 transition-colors" style={{ borderColor: 'color-mix(in srgb, var(--theme-secondary) 40%, transparent)' }}>
                 <span className="block text-[11px] tracking-[0.2em] font-black uppercase mb-2" style={{ color: 'var(--theme-accent)' }}>Formación</span>
                 <span className="text-lg md:text-xl font-bold text-white uppercase tracking-widest break-words leading-tight block">
                   {data?.education || '--'}
                 </span>
               </div>
            </div>

          </div>

          <div className="absolute top-6 right-8 text-white/[0.03] font-heading font-black text-8xl pointer-events-none select-none" style={{ transform: "translateZ(-10px)" }}>
            BIO
          </div>

        </motion.div>
      </div>

    </section>
  );
}
