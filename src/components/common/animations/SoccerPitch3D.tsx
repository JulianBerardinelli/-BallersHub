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

export const ONBOARDING_TO_POS_CODE: Record<string, string> = {
  "ARQUERO": "POR",
  "CENTRAL": "DFC",
  "LATERAL DERECHO": "LD",
  "LATERAL IZQUIERDO": "LI",
  "CARRILERO": "LI",
  "MEDIOCENTRO": "MC",
  "PIVOTE": "MCD",
  "INTERIOR": "MC",
  "VOLANTE DERECHO": "MD",
  "VOLANTE IZQUIERDO": "MI",
  "MEDIAPUNTA": "MCO",
  "CENTRODELANTERO": "DEL",
  "EXTREMO DERECHO": "ED",
  "EXTREMO IZQUIERDO": "EI",
  "SEGUNDO DELANTERO": "SD",
};

export function normalizePosition(p: string | null | undefined): string | null {
  if (!p) return null;
  const upper = p.toUpperCase().trim();
  if (ONBOARDING_TO_POS_CODE[upper]) return ONBOARDING_TO_POS_CODE[upper];
  if (POSITIONS_MAP[upper]) return upper;
  return null;
}

export default function SoccerPitch3D({
  playerPositions = [],
  characteristics = [],
}: {
  playerPositions?: string[];
  characteristics?: string[];
}) {
  const validPositions = playerPositions
    .filter(p => !["ARQ", "DEF", "MID", "DEL"].includes(p.toUpperCase().trim()))
    .map(p => normalizePosition(p))
    .filter((p): p is string => p !== null);

  const PALETTES = [
    "var(--theme-primary)",
    "#f97316", // orange-500
    "#8b5cf6", // violet-500
    "#10b981", // emerald-500
  ];

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
          const color = PALETTES[i % PALETTES.length];

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
                <div
                  className="relative group outline-none pointer-events-none"
                  style={{ transform: "rotateZ(20deg) rotateX(-65deg)" }}
                >
                  {/* Shadow / Glow floor */}
                  <motion.div
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.6, 1, 0.6],
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    className="absolute top-0 left-0 w-10 h-10 -ml-5 -mt-5 rounded-full blur-[8px] mix-blend-screen transition-colors duration-300"
                    style={{ backgroundColor: color }}
                  />
                  {/* Floating Node */}
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                    className="relative w-4 h-4 rounded-full border-2 transition-colors duration-300 flex items-center justify-center z-10 bg-white"
                    style={{ borderColor: color, boxShadow: `0 0 15px ${color}` }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  </motion.div>
                </div>
              </motion.div>
            </React.Fragment>
          );
        })}
      </motion.div>

      {/* ── FLOATING INFO CARDS ───────────────────────────────── */}
      <AnimatePresence mode="wait">
        {validPositions.map((posCode, i) => {
          const config = POSITIONS_MAP[posCode.toUpperCase()];
          const color = PALETTES[i % PALETTES.length];

          const SLOTS = [
            // 1. Top Right
            { style: { top: "8%" }, className: "right-[0%] lg:right-[-5%] xl:right-[-10%]" },
            // 2. Bottom Left
            { style: { top: "70%" }, className: "left-[0%] lg:left-[-5%] xl:left-[-10%]" },
            // 3. Bottom Right
            { style: { top: "70%" }, className: "right-[0%] lg:right-[-5%] xl:right-[-10%]" },
            // 4. Mid Left
            { style: { top: "40%" }, className: "left-[0%] lg:left-[-5%] xl:left-[-10%]" },
          ];

          const slot = SLOTS[i % SLOTS.length];

          return (
            <motion.div
              key={posCode}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ delay: 1.2 + i * 0.2, type: "spring", stiffness: 300, damping: 20 }}
              className={`
                absolute z-20 pointer-events-none
                bg-black/40 backdrop-blur-xl border-l-[3px] p-3 shadow-2xl
                w-[220px] sm:w-[240px]
                ${slot.className}
              `}
              style={{ ...slot.style, borderColor: color }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-white/50 mb-0.5">
                    Posición
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-white uppercase leading-tight">
                    {config.label}
                  </h4>
                </div>
                <div 
                  className="w-9 h-9 flex items-center justify-center bg-white/5 rounded-full font-black text-sm"
                  style={{ color: color }}
                >
                  {posCode.toUpperCase()}
                </div>
              </div>

              <div>
                <span className="block text-[9px] font-black uppercase tracking-[0.2em] mb-1 text-white/70">
                  Zona de Influencia
                </span>
                <p className="text-xs font-bold text-white/80 uppercase tracking-widest">
                  {config.area}
                </p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

