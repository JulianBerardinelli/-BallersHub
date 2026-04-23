"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Posiciones al porcentaje en el campo (equipo atacando hacia "arriba")
export const POSITIONS_MAP: Record<string, { top: string; left: string; label: string; area: string; strengths: string[] }> = {
  "POR": { top: "90%", left: "50%", label: "Portero",            area: "Área Chica Propia",        strengths: ["Reflejos", "Juego Aéreo", "Saque Largo"] },
  "DFC": { top: "75%", left: "50%", label: "Defensa Central",    area: "Zaga Central",             strengths: ["Anticipación", "Corte", "Juego Aéreo"] },
  "LI":  { top: "70%", left: "15%", label: "Lateral Izquierdo",  area: "Banda Izquierda",          strengths: ["Proyección", "Resistencia", "Centros"] },
  "LD":  { top: "70%", left: "85%", label: "Lateral Derecho",    area: "Banda Derecha",            strengths: ["Velocidad", "Marca", "Recorridos"] },
  "MCD": { top: "60%", left: "50%", label: "Pivote Defensivo",   area: "Círculo Central Medular",  strengths: ["Recuperación", "Pase Corto", "Posicionamiento"] },
  "MC":  { top: "50%", left: "50%", label: "Centro Campista",    area: "Medular",                  strengths: ["Distribución", "Visión", "Despliegue"] },
  "MI":  { top: "45%", left: "20%", label: "Interior Izquierdo", area: "Medio Izquierdo",          strengths: ["Dribbling", "Pases Filtrados", "Asociación"] },
  "MD":  { top: "45%", left: "80%", label: "Interior Derecho",   area: "Medio Derecho",            strengths: ["Conducción", "Centros", "Llegada"] },
  "MCO": { top: "35%", left: "50%", label: "Medio Ofensivo",     area: "3/4 de Cancha Frontal",   strengths: ["Creación", "Último Pase", "Tiro Media Distancia"] },
  "EI":  { top: "25%", left: "15%", label: "Extremo Izquierdo",  area: "Carril Izquierdo Alto",    strengths: ["Desborde", "1 vs 1", "Centros al Área"] },
  "ED":  { top: "25%", left: "85%", label: "Extremo Derecho",    area: "Carril Derecho Alto",      strengths: ["Picardía", "Velocidad", "Corte hacia adentro"] },
  "DEL": { top: "15%", left: "50%", label: "Centrodelantero",    area: "Área Rival",               strengths: ["Definición", "Juego Aéreo", "Posicionamiento"] },
  "SD":  { top: "20%", left: "50%", label: "Segundo Delantero",  area: "Frontal de Área",          strengths: ["Asociación", "Desmarque", "Conducción Rápida"] },
};

export default function SoccerPitch3D({
  playerPositions = [],
  characteristics = [],
}: {
  playerPositions?: string[];
  characteristics?: string[];
}) {
  const [activePos, setActivePos] = useState<string | null>(
    playerPositions.length > 0 ? playerPositions[0] : null
  );

  const validPositions = playerPositions.filter((p) => POSITIONS_MAP[p.toUpperCase()]);

  return (
    /*
      Container width/height responsive via CSS classes:
      - xs mobile:  220px × 275px
      - sm:         270px × 338px
      - md:         310px × 388px
      - lg:         350px × 438px (original ~360×450)
      
      perspective-[1200px] y preserve-3d se mantienen intactos
      para conservar el efecto 3D.
    */
    <div className="relative w-full max-w-2xl mx-auto flex items-center justify-center" style={{ perspective: '1200px' }}>
      {/* ── CAMPO INCLINADO EN PERSPECTIVA ─────────────────── */}
      <motion.div
        initial={{ rotateX: 65, rotateZ: -20, scale: 0.8, opacity: 0 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        viewport={{ once: true, margin: "-100px" }}
        style={{ transformStyle: "preserve-3d" }}
        className="
          relative rounded-xl border-2 overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]
          w-[220px] h-[275px]
          sm:w-[270px] sm:h-[338px]
          md:w-[310px] md:h-[388px]
          lg:w-[350px] lg:h-[438px]
        "
      >
        {/* Pitch base styling */}
        <div className="absolute inset-0 bg-neutral-900 overflow-hidden opacity-90 border-4 border-white/20">
          {/* Grass stripes */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(0deg,transparent_49px,#fff_50px)] bg-[length:100%_50px]" />

          {/* Pitch Lines */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/30 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-[80px] h-[80px] border-[2px] border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2" />

          {/* Goal Areas — Top */}
          <div className="absolute top-0 left-1/2 w-[160px] h-[80px] border-b-[2px] border-l-[2px] border-r-[2px] border-white/30 -translate-x-1/2" />
          <div className="absolute top-0 left-1/2 w-[80px] h-[30px] border-b-[2px] border-l-[2px] border-r-[2px] border-white/30 -translate-x-1/2" />
          <div className="absolute top-[60px] left-1/2 w-[4px] h-[4px] bg-white/30 rounded-full -translate-x-1/2" />

          {/* Goal Areas — Bottom */}
          <div className="absolute bottom-0 left-1/2 w-[160px] h-[80px] border-t-[2px] border-l-[2px] border-r-[2px] border-white/30 -translate-x-1/2" />
          <div className="absolute bottom-0 left-1/2 w-[80px] h-[30px] border-t-[2px] border-l-[2px] border-r-[2px] border-white/30 -translate-x-1/2" />
          <div className="absolute bottom-[60px] left-1/2 w-[4px] h-[4px] bg-white/30 rounded-full -translate-x-1/2" />
        </div>

        {/* ── POSICIÓN MARKERS (billboarding) ─────────────── */}
        {validPositions.map((posCode, i) => {
          const config = POSITIONS_MAP[posCode.toUpperCase()];
          const isActive = activePos === posCode;

          return (
            <React.Fragment key={posCode}>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.2, duration: 0.5, type: "spring" }}
                viewport={{ once: true }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
                style={{ top: config.top, left: config.left }}
              >
                <button
                  onClick={() => setActivePos(posCode)}
                  className="relative group outline-none"
                  style={{ transform: "rotateZ(20deg) rotateX(-65deg)" }}
                >
                  {/* Shadow / Glow floor */}
                  <motion.div
                    animate={{
                      scale: isActive ? [1, 1.3, 1] : 1,
                      opacity: isActive ? [0.6, 1, 0.6] : 0.2,
                    }}
                    transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
                    className={`absolute top-0 left-0 w-10 h-10 -ml-5 -mt-5 rounded-full blur-[8px] mix-blend-screen transition-colors duration-300 ${
                      isActive ? 'bg-[var(--theme-primary)]' : 'bg-white'
                    }`}
                  />
                  {/* Floating Node */}
                  <motion.div
                    animate={{ y: isActive ? [0, -10, 0] : 0 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className={`relative w-5 h-5 rounded-full border-2 cursor-pointer transition-colors duration-300 flex items-center justify-center z-10 ${
                      isActive
                        ? 'bg-white border-[var(--theme-primary)] shadow-[0_0_15px_var(--theme-primary)]'
                        : 'bg-neutral-800 border-white/40 hover:bg-white hover:border-white'
                    }`}
                  >
                    {isActive && <div className="w-2 h-2 bg-[var(--theme-primary)] rounded-full" />}
                  </motion.div>
                </button>
              </motion.div>
            </React.Fragment>
          );
        })}
      </motion.div>

      {/* ── FLOATING INFO CARD ─────────────────────────────────
          Mobile: centrada debajo del campo (bottom, centered)
          lg+:    posicionada a la derecha del campo
          
          Se usa overflow: visible en el parent para evitar clip.
      */}
      <AnimatePresence mode="wait">
        {activePos && POSITIONS_MAP[activePos.toUpperCase()] && (
          <motion.div
            key={activePos}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="
              absolute z-20 pointer-events-none
              bg-black/40 backdrop-blur-xl border-l-[3px] p-4 shadow-2xl
              w-[260px]
              top-[8%] right-[-5%]
            "
            style={{ borderColor: "color-mix(in srgb, var(--theme-primary) 100%, transparent)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-white/50 mb-0.5">
                  Posición
                </span>
                <h4 className="text-lg sm:text-xl font-black text-white uppercase leading-tight">
                  {POSITIONS_MAP[activePos.toUpperCase()].label}
                </h4>
              </div>
              <div className="w-9 h-9 flex items-center justify-center bg-white/5 rounded-full font-black text-[var(--theme-primary)] text-sm">
                {activePos.toUpperCase()}
              </div>
            </div>

            <div>
              <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--theme-accent)] mb-1">
                Zona de Influencia
              </span>
              <p className="text-xs font-bold text-white/80 uppercase tracking-widest">
                {POSITIONS_MAP[activePos.toUpperCase()].area}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
