"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Share2 } from "lucide-react";

export default function ProPlayerHeader({ player }: { player: any }) {
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Perfil de ${player.fullName}`,
          text: `Mira el perfil profesional de ${player.fullName} en BallersHub.`,
          url: window.location.href,
        });
      }
    } catch (error) {
      console.log("Error compartiendo", error);
    }
  };

  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 left-0 w-full z-[100] pt-6 px-6 lg:px-12 pointer-events-none"
    >
      <div className="relative w-full max-w-[1400px] mx-auto flex items-center justify-center">
        
        {/* Nav Central - Glassmorphism Pill */}
        <nav className="pointer-events-auto bg-black/40 backdrop-blur-xl border border-white/10 rounded-full pl-2 pr-6 py-2 flex items-center gap-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all">
          <div className="flex items-center gap-4">
             {player.avatarUrl && (
               <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 shadow-inner shrink-0">
                 <img src={player.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
               </div>
             )}
            <button className="text-white/70 hover:text-white transition-colors text-xs font-semibold uppercase tracking-widest pointer-events-auto" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Inicio
            </button>
          </div>
          <button className="text-white/70 hover:text-white transition-colors text-xs font-semibold uppercase tracking-widest pointer-events-auto" onClick={() => document.getElementById('biography')?.scrollIntoView({ behavior: 'smooth' })}>
            Stats
          </button>
          <button className="text-white/70 hover:text-white transition-colors text-xs font-semibold uppercase tracking-widest pointer-events-auto" onClick={() => document.getElementById('career')?.scrollIntoView({ behavior: 'smooth' })}>
            Carrera
          </button>
          <button className="text-white/70 hover:text-white transition-colors text-xs font-semibold uppercase tracking-widest pointer-events-auto" onClick={() => document.getElementById('media')?.scrollIntoView({ behavior: 'smooth' })}>
            Media
          </button>
          <div className="w-px h-4 bg-white/20 mx-2" />
          <button onClick={handleShare} className="text-white hover:text-amber-400 transition-colors pointer-events-auto">
            <Share2 className="w-4 h-4" />
          </button>
        </nav>

        {/* Branding (Fuera de la píldora, a la derecha) */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-auto flex flex-col items-end hidden md:flex">
          <span className="text-white/50 text-[10px] uppercase tracking-[0.3em] mb-1 font-bold">Powered BY</span>
          <span className="font-heading font-black text-white text-lg leading-none tracking-tight">BallersHub</span>
        </div>

      </div>
    </motion.header>
  );
}
