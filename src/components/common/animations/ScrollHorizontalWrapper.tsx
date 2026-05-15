"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

export default function ScrollHorizontalWrapper({ children }: { children: React.ReactNode }) {
  const targetRef = useRef<HTMLDivElement>(null);
  
  // Rastrear el progreso de scroll vertical sobre este contenedor grande (300vh por ejemplo)
  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  // Suavizar el progreso para evitar saltos (especial trackpads)
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 400,
    damping: 90,
    mass: 0.1
  });

  // Traducir ese 0-1 de scroll a desplazamiento X de 0 a -100% (menos el viewport).
  // Ajustamos a -80% aprox para que el último elemento quede en la pista.
  const x = useTransform(smoothProgress, [0, 1], ["0%", "-85%"]);

  return (
    // La altura del section define cuán largo es el scroll. 300vh = 3 pantallas de scroll vertical necesario.
    <section ref={targetRef} className="relative h-[300vh] mt-20">
      
      {/* Contenedor que se vuelve pegajoso (sticky) y atrapa la pantalla */}
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        
        {/* Fondo sutil uniendo los módulos */}
        <div className="absolute inset-0 bg-neutral-950 pointer-events-none" />

        {/* El Track horizontal animado */}
        <motion.div 
           style={{ x }} 
           className="flex items-start gap-12 md:gap-32 px-12 md:px-32 w-max h-full pt-32 pb-20"
        >
          {children}
        </motion.div>
        
      </div>
    </section>
  );
}
