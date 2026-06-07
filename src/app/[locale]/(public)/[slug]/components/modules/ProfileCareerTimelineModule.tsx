"use client";

import React, { useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent, animate, AnimatePresence } from "framer-motion";
import { useLenis } from "lenis/react";
import CountryFlag from "@/components/common/CountryFlag";
import Image from "next/image";
import TeamCrest from "@/components/teams/TeamCrest";
import TransfermarktIcon from "@/components/icons/TransfermarktIcon";
import BeSoccerIcon from "@/components/icons/BeSoccerIcon";
import FlashscoreIcon from "@/components/icons/FlashscoreIcon";
import CountUp from "@/components/ui/CountUp";
import BioAnimatedBackground from "./BioAnimatedBackground";

type ExternalLinks = { transfermarkt: string | null; beSoccer: string | null; flashscore?: string | null; };
export default function ProfileCareerTimelineModule({ career, externalLinks }: { career: any[]; externalLinks?: ExternalLinks }) {
  // Sort from most recent to oldest
  const sortedCareer = [...career].sort((a, b) => {
    if (!a.startDate) return -1;
    if (!b.startDate) return 1;
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  const [selectedHonour, setSelectedHonour] = useState<any>(null);

  if (sortedCareer.length === 0) return null;

  return (
    <div className="w-full relative font-sans" id="career-timeline">
      <AnimatePresence>
        {selectedHonour && (
          <HonourModal honour={selectedHonour} onClose={() => setSelectedHonour(null)} />
        )}
      </AnimatePresence>

      {/* MOBILE TIMELINE (Vertical Zig-Zag, visible only < lg).
          Padding horizontal apretado contra el borde izquierdo: la línea +
          nodo viven en los primeros ~24px del viewport y las cards arrancan
          a ~40px, liberando ~36px más de ancho para las stats internas
          (Partidos / Titular / Minutos / Goles / Asist no se aplastan). */}
      <div className="block lg:hidden w-full relative py-16 pl-3 pr-4">
        {/* Ambient backdrop — mirrors the Bio section pattern. Lives at
            the wrapper level (no max-width on this div), the radial mask
            inside the component handles the soft edge fade. */}
        <BioAnimatedBackground />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 w-full mb-12 flex flex-col"
        >
           <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--theme-accent)] mb-2">
             Historial Deportivo
           </h2>
           <h3 className="text-3xl font-black font-heading text-white uppercase drop-shadow-lg leading-none">
             Trayectoria
           </h3>
        </motion.div>

        <div className="relative z-10">
           {/* Mobile Line — pegada al borde izquierdo */}
           <div className="absolute top-0 bottom-0 left-[12px] w-[2px] bg-white/10 rounded-full" />

           <div className="flex flex-col gap-8 relative w-full">
              {sortedCareer.map((item, index) => {
                  const nodeData = prepareCardData(item, index);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "0px 0px -100px 0px" }}
                      className="relative w-full flex items-center pl-[28px]"
                    >
                       <div className="absolute left-[12px] w-4 h-4 rounded-full bg-[var(--theme-primary)] shadow-[0_0_15px_var(--theme-primary)] -translate-x-1/2 z-10">
                         <div className="absolute inset-[3px] rounded-full bg-black/50" />
                       </div>
                       <MobileTimelineCard nodeData={nodeData} onSelectHonour={setSelectedHonour} />
                    </motion.div>
                  );
              })}
           </div>
        </div>
      </div>

      {/* DESKTOP TIMELINE OPTION 2 (Nodes Centralized, visible >= lg) */}
      <div className="hidden lg:block w-full">
         <DesktopNodesTimeline sortedCareer={sortedCareer} externalLinks={externalLinks} onSelectHonour={setSelectedHonour} />
      </div>
    </div>
  );
}


function DesktopNodesTimeline({ sortedCareer, externalLinks, onSelectHonour }: { sortedCareer: any[]; externalLinks?: ExternalLinks; onSelectHonour: (h: any) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  
  // Progression is visually reversed: we start at the right (Newest) and shrink towards left (Oldest)
  // Matched exactly to scrollYProgress to prevent overshoot bouncing
  const progressBarWidth = useTransform(scrollYProgress, [0, 1], ["100%", "0%"]);

  const [activeIndex, setActiveIndex] = useState(0);
  const isScrollingProgrammatically = useRef(false);
  const lenis = useLenis();

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (isScrollingProgrammatically.current) return;
    let idx = Math.round(latest * Math.max(sortedCareer.length - 1, 1));
    idx = Math.min(Math.max(idx, 0), sortedCareer.length - 1);
    if (idx !== activeIndex) {
      setActiveIndex(idx);
    }
  });

  const handleNodeClick = (index: number) => {
    if (!containerRef.current) return;
    
    setActiveIndex(index);
    isScrollingProgrammatically.current = true;
    
    const stepSize = 1 / Math.max(sortedCareer.length - 1, 1);
    const peakProgress = index * stepSize;
    
    const rect = containerRef.current.getBoundingClientRect();
    const absoluteTop = window.scrollY + rect.top;
    const scrollableDistance = containerRef.current.offsetHeight - window.innerHeight;
    const targetScrollY = absoluteTop + (peakProgress * scrollableDistance);
    
    if (lenis) {
      lenis.scrollTo(targetScrollY, { duration: 1.2, lock: true });
      setTimeout(() => { isScrollingProgrammatically.current = false; }, 1250);
    } else {
       animate(window.scrollY, targetScrollY, {
         duration: 1.2,
         ease: [0.32, 0.72, 0, 1],
         onUpdate: (latest) => window.scrollTo(0, latest),
         onComplete: () => {
            isScrollingProgrammatically.current = false;
         }
       });
    }
  };

  return (
    /*
      El container externo rompe los bounds del wrapper padre (max-w-[1400px]
      del ProAthleteLayout) para que el sticky de adentro herede el ancho del
      viewport completo. Con el ancho real a 100vw, el `BioAnimatedBackground`
      (que ya está pensado en 100vw) ya no se corta visualmente cuando los
      blobs de luz llegan al borde. Usamos negative margins en lugar de
      `position: relative + left-1/2` para no entrar en conflicto con el
      `position: sticky` del hijo. Eje vertical intacto: solo expandimos x.
    */
    <div
      ref={containerRef}
      className="relative w-screen"
      style={{
        height: "450vh",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
      }}
    >
      <motion.div
        className="sticky top-0 h-screen w-full flex flex-col items-center overflow-hidden bg-[var(--theme-background)] z-20"
      >

         {/* Themed ambient orbs + dot pattern (same component as Bio).
             Lives inside the sticky so it's visible during the entire
             pin range, not just the middle slice. */}
         <BioAnimatedBackground />

         {/* Top & bottom fade overlays — paint the page background back
             over the bg's top and bottom strips so the ambient orbs
             dissolve into the page seamlessly instead of being clipped
             to the sticky's square edges. The radial mask inside the
             bg component handles the side fade. */}
         <div
           aria-hidden="true"
           className="absolute top-0 left-0 right-0 h-[14vh] z-[1] pointer-events-none"
           style={{ background: 'linear-gradient(to bottom, var(--theme-background) 25%, transparent 100%)' }}
         />
         <div
           aria-hidden="true"
           className="absolute bottom-0 left-0 right-0 h-[18vh] z-[1] pointer-events-none"
           style={{ background: 'linear-gradient(to top, var(--theme-background) 25%, transparent 100%)' }}
         />

         {/* Inner layout: distributes title, card, and timeline proportionally within viewport */}
         <div className="w-full max-w-[1240px] px-8 flex flex-col relative z-10" style={{ height: '100svh', paddingTop: '128px', paddingBottom: '0px', justifyContent: 'space-between', alignItems: 'center' }}>
            
             {/* Header */}
             <div className="text-center shrink-0">
                <h2 className="text-[9px] font-black uppercase tracking-[0.5em] text-[var(--theme-accent)] mb-1">
                  Historial Deportivo
                </h2>
                <h3 className="text-3xl lg:text-4xl xl:text-5xl font-black font-heading text-white uppercase drop-shadow-2xl leading-[0.9]">
                  Trayectoria
                </h3>
                <p className="mt-1.5 mx-auto text-white/40 font-medium text-[10px] max-w-xs leading-relaxed">
                  Scrollea para navegar por cada etapa de su carrera profesional.
                </p>

                 {/* Platform links with decorative line that splits around buttons */}
                 {(externalLinks?.transfermarkt || externalLinks?.beSoccer || externalLinks?.flashscore) && (
                   <div className="mt-4 relative flex items-center gap-0 w-full max-w-lg mx-auto">
                     {/* Left line arm - fades from transparent to theme primary */}
                     <div className="flex-1 min-w-[48px]" style={{ height: '1px', background: 'linear-gradient(to right, transparent, var(--theme-accent))' }} />
                     {/* Buttons cluster */}
                     <div className="flex items-center gap-2 px-3 flex-wrap justify-center shrink-0">
                       {externalLinks.transfermarkt && (
                         <a
                           href={externalLinks.transfermarkt}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/8 hover:border-[#B5101F]/40 transition-all duration-300 overflow-hidden"
                         >
                           <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(181,16,31,0.12), rgba(0,25,63,0.08))' }} />
                           <div className="relative z-10 flex items-center justify-center w-7 h-5 rounded overflow-hidden bg-white shrink-0">
                             <TransfermarktIcon className="w-full h-full" />
                           </div>
                           <div className="relative z-10 flex flex-col items-start">
                             <span className="text-[10px] font-black text-white/90 leading-none tracking-wide">Transfermarkt</span>
                             <span className="text-[8px] text-white/30 font-medium leading-none mt-0.5">Perfil oficial</span>
                           </div>
                         </a>
                       )}
                       {externalLinks.beSoccer && (
                         <a
                           href={externalLinks.beSoccer}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/8 hover:border-[#009e1e]/40 transition-all duration-300 overflow-hidden"
                         >
                           <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(0,158,30,0.12), transparent)' }} />
                           <div className="relative z-10 w-5 h-5 shrink-0">
                             <BeSoccerIcon className="w-full h-full" />
                           </div>
                           <div className="relative z-10 flex flex-col items-start">
                             <span className="text-[10px] font-black text-white/90 leading-none tracking-wide">BeSoccer</span>
                             <span className="text-[8px] text-white/30 font-medium leading-none mt-0.5">Perfil oficial</span>
                           </div>
                         </a>
                       )}
                       {externalLinks?.flashscore && (
                         <a
                           href={externalLinks.flashscore}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/8 hover:border-[#fe0046]/40 transition-all duration-300 overflow-hidden"
                         >
                           <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(254,0,70,0.12), transparent)' }} />
                           <div className="relative z-10 flex items-center justify-center w-5 h-5 rounded overflow-hidden shrink-0 bg-[#001e28]">
                             <FlashscoreIcon className="w-full h-full" />
                           </div>
                           <div className="relative z-10 flex flex-col items-start">
                             <span className="text-[10px] font-black text-white/90 leading-none tracking-wide">Flashscore</span>
                             <span className="text-[8px] text-white/30 font-medium leading-none mt-0.5">Perfil oficial</span>
                           </div>
                         </a>
                       )}
                     </div>
                     {/* Right line arm - fades from theme primary to transparent */}
                     <div className="flex-1 min-w-[48px]" style={{ height: '1px', background: 'linear-gradient(to left, transparent, var(--theme-accent))' }} />
                   </div>
                 )}
              </div>


            {/* THE CENTRAL CARD STACK */}
            <div className="relative w-full flex-1 flex items-center justify-center perspective-1000 min-h-0 pt-0 pb-1">
               {sortedCareer.map((item, index) => {
                 const nodeData = prepareCardData(item, index);
                 const isActive = index === activeIndex;

                 return (
                   <motion.div
                     key={item.id}
                     initial={false}
                     animate={{ 
                       opacity: isActive ? 1 : 0, 
                       scale: isActive ? 1 : 0.95,
                       zIndex: isActive ? 50 : 10
                     }}
                     transition={{ duration: 0.3 }}
                     style={{ pointerEvents: isActive ? "auto" : "none" }}
                     className="absolute w-full max-w-[750px] drop-shadow-2xl"
                   >
                     {/* Tarjeta Glassmorphism */}
                     <div className="w-full bg-black/40 backdrop-blur-[40px] border border-white/10 ring-1 ring-white/5 rounded-[2rem] p-5 lg:p-6 flex flex-col relative overflow-hidden shadow-[inset_0_0_60px_rgba(255,255,255,0.03)]">
                         <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-[var(--theme-primary)] rounded-full blur-[80px] opacity-[0.1] pointer-events-none" />

                         <div className="flex justify-between items-start mb-3">
                             <div className="flex flex-col">
                                <span className={`w-fit px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest mb-3 ${nodeData.isCurrent ? 'bg-[var(--theme-primary)] text-white' : 'bg-white/10 text-white/60'}`}>
                                   {nodeData.startYear} - {nodeData.endYear}
                                </span>
                                <h4 className="text-2xl lg:text-3xl font-black text-white uppercase leading-[1.1] max-w-[480px] text-pretty">
                                   {nodeData.club}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                   {nodeData.team?.countryCode && <CountryFlag code={nodeData.team.countryCode} className="w-5 h-4 object-cover rounded-[2px]" />}
                                   {nodeData.divisionData?.crestUrl && <TeamCrest src={nodeData.divisionData.crestUrl} size={28} className="drop-shadow-md" />}
                                   <span className="text-white/60 font-bold uppercase tracking-widest text-xs">
                                     {nodeData.divisionData?.name || nodeData.division || "División no especificada"}
                                   </span>
                                   {nodeData.secondaryDivisionData?.name ? (
                                     <span className="inline-flex items-center gap-1.5 text-white/40 font-bold uppercase tracking-widest text-[10px] before:content-['+'] before:text-white/30">
                                       {nodeData.secondaryDivisionData.crestUrl ? (
                                         <TeamCrest src={nodeData.secondaryDivisionData.crestUrl} size={20} className="drop-shadow-md" />
                                       ) : null}
                                       <span>{nodeData.secondaryDivisionData.name}</span>
                                     </span>
                                   ) : null}
                                </div>
                             </div>
                             
                             {nodeData.team?.crestUrl && (
                                <TeamCrest src={nodeData.team.crestUrl} size={80} className="opacity-90" />
                             )}
                         </div>

                         {/* Stats Data Centralizd */}
                         {nodeData.hasStats && (
                            <div className="grid grid-cols-5 gap-0 bg-black/40 rounded-2xl border border-white/5 overflow-hidden mb-3">
                               <div className="flex flex-col items-center justify-center p-3 lg:p-4">
                                 <span className="text-[9px] lg:text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Partidos</span>
                                 <CountUp value={nodeData.totals.matches} className="text-xl lg:text-3xl text-white font-black leading-none" />
                               </div>
                               <div className="flex flex-col items-center justify-center p-3 lg:p-4 border-l border-white/5">
                                 <span className="text-[9px] lg:text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Titular</span>
                                 <div className="relative w-12 h-12 lg:w-14 lg:h-14 flex items-center justify-center mt-1">
                                    <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                                      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3.5" fill="transparent" className="text-white/10" />
                                      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3.5" fill="transparent"
                                        strokeDasharray="125.66"
                                        strokeDashoffset={125.66 - ((nodeData.totals.matches > 0 ? Math.round((nodeData.totals.startingMatches / nodeData.totals.matches) * 100) : 0) / 100) * 125.66}
                                        className="text-[#10b981] transition-all duration-1000 ease-out drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" strokeLinecap="round" />
                                    </svg>
                                    {/* Center value: just the starting-matches count.
                                        Removed the redundant "%" label — the ring
                                        already encodes the ratio visually. */}
                                    <CountUp value={nodeData.totals.startingMatches} className="relative text-lg lg:text-xl font-black text-white leading-none" />
                                 </div>
                               </div>
                               <div className="flex flex-col items-center justify-center p-3 lg:p-4 border-l border-white/5">
                                 <span className="text-[9px] lg:text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Minutos</span>
                                 <span className="text-xl lg:text-3xl text-white font-black leading-none">
                                   <CountUp value={nodeData.totals.minutesPlayed} />
                                   <span className="text-sm lg:text-lg text-white/50 ml-0.5">&apos;</span>
                                 </span>
                               </div>
                               <div className="flex flex-col items-center justify-center p-3 lg:p-4 border-l border-white/5 bg-[var(--theme-accent)]/5">
                                 <span className="text-[9px] lg:text-[10px] text-[var(--theme-accent)]/80 uppercase font-bold tracking-widest mb-1">Goles</span>
                                 <CountUp value={nodeData.totals.goals} className="text-xl lg:text-3xl text-[var(--theme-accent)] font-black leading-none" />
                               </div>
                               <div className="flex flex-col items-center justify-center p-3 lg:p-4 border-l border-white/5 bg-[var(--theme-primary)]/5">
                                 <span className="text-[9px] lg:text-[10px] text-[var(--theme-primary)]/80 uppercase font-bold tracking-widest mb-1">Asist.</span>
                                 <CountUp value={nodeData.totals.assists} className="text-xl lg:text-3xl text-[var(--theme-primary)] font-black leading-none" />
                               </div>
                            </div>
                         )}

                         {/* Honours + Transfermarkt club link in a parallel row.
                             Honours grid takes the remaining space; the
                             transfermarkt link sits as a compact chip on the
                             right so the card stays short enough not to
                             collide with the player platform links above. */}
                         {(nodeData.itemHonours.length > 0 || nodeData.team?.transfermarktUrl) && (
                           <div className="flex flex-row items-stretch gap-2 mt-2 min-h-0">
                             {nodeData.itemHonours.length > 0 && (
                               <div className="flex-1 grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto scrollbar-hide pr-1 min-w-0">
                                 {nodeData.itemHonours.map((p: any) => {
                                   const isTrophy = isHonourTrophy(p.title);
                                   return (
                                   <div key={p.id} onClick={() => onSelectHonour(p)} className="group w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-lg cursor-pointer hover:bg-yellow-500/20 transition-colors">
                                      <div className="flex flex-col truncate pr-2">
                                        <span className="text-yellow-500 font-extrabold text-[10px] uppercase tracking-wider truncate group-hover:text-yellow-400 transition-colors">{p.title}</span>
                                        {p.competition && <span className="text-yellow-500/50 text-[9px] font-bold uppercase truncate group-hover:text-yellow-500/80 transition-colors">{p.competition} {p.season && `• ${p.season}`}</span>}
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <div className="flex items-center justify-center w-6 h-6 shrink-0 rounded-full bg-yellow-500/20 text-yellow-500 text-[10px]">
                                          {isTrophy ? (
                                             <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15 8H9L12 2Z" /><path d="M19 8H5V10C5 13.866 8.13401 17 12 17C15.866 17 19 13.866 19 10V8Z" /><path d="M11 17V20H8V22H16V20H13V17H11Z" /><path d="M5 8C3.34315 8 2 9.34315 2 11C2 12.6569 3.34315 14 5 14V8Z" /><path d="M19 8C20.6569 8 22 9.34315 22 11C22 12.6569 20.6569 14 19 14V8Z" /></svg>
                                          ) : (
                                             <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                          )}
                                        </div>
                                        <svg className="w-3.5 h-3.5 text-yellow-500/50 group-hover:text-yellow-500 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                      </div>
                                   </div>
                                 )})}
                               </div>
                             )}

                             {nodeData.team?.transfermarktUrl && (
                               <a
                                 href={nodeData.team.transfermarktUrl}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 aria-label="Ver perfil del club en Transfermarkt"
                                 className={`group shrink-0 self-start flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/8 hover:border-[#B5101F]/40 transition-all duration-300 overflow-hidden relative ${nodeData.itemHonours.length > 0 ? 'w-[88px]' : 'w-full'}`}
                               >
                                 <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(181,16,31,0.12), rgba(0,25,63,0.08))' }} />
                                 <div className="relative z-10 flex items-center justify-center w-9 h-5 rounded overflow-hidden bg-white shrink-0">
                                   <TransfermarktIcon className="w-full h-full" />
                                 </div>
                                 <span className="relative z-10 text-[8px] font-black text-white/70 leading-none tracking-[0.15em] uppercase group-hover:text-white text-center">
                                   {nodeData.itemHonours.length > 0 ? 'Club' : 'Ver club en Transfermarkt'}
                                 </span>
                               </a>
                             )}
                           </div>
                         )}
                      </div>
                   </motion.div>
                 );
               })}
            </div>

            {/* BOTTOM TARGET NODES */}
            {/* Container 170px. Track at top:24px. Labels below dot fit within 170px. No clip issues. */}
            <div className="relative w-full shrink-0" style={{ height: '170px' }}>
               {/* Track line at top:24px */}
               <div className="absolute left-0 right-0 h-[2px] bg-white/10 rounded-full" style={{ top: '24px' }} />
               
               {/* Progress bar at same level */}
               <motion.div 
                 style={{ width: progressBarWidth, position: 'absolute', top: '24px', left: 0 }}
                 className="h-[2px] bg-gradient-to-r from-transparent via-[var(--theme-primary)] to-[var(--theme-primary)] rounded-full shadow-[0_0_20px_var(--theme-primary)]"
               />
               
               {/* Nodes */}
               {sortedCareer.map((item, index) => {
                 const stepPct = (1 - (index / Math.max(sortedCareer.length - 1, 1))) * 100;
                 const isActive = index === activeIndex;
                 const nodeData = prepareCardData(item, index);
                 
                 return (
                   <div 
                     key={index} 
                     onClick={() => handleNodeClick(index)}
                     className="absolute flex flex-col items-center cursor-pointer"
                     style={{ top: '17px', left: `${stepPct}%`, transform: 'translateX(-50%)' }}
                   >
                     {/* Dot */}
                     <motion.div 
                       animate={{ 
                         scale: isActive ? 1.3 : 1, 
                         backgroundColor: isActive ? "var(--theme-primary)" : "#222", 
                         borderColor: isActive ? "white" : "rgba(255,255,255,0.2)" 
                       }}
                       whileHover={{ scale: isActive ? 1.3 : 1.3 }}
                       transition={{ duration: 0.3 }}
                       className="w-3.5 h-3.5 rounded-full border-[3px] z-10 shadow-lg relative shrink-0"
                     >
                       {isActive && <div className="absolute inset-0 rounded-full blur-[8px] bg-[var(--theme-primary)] opacity-80" />}
                     </motion.div>

                     {/* Labels flow below dot - year + name + crest ≈ 130px total, fits in 170-17=153px remaining */}
                     <motion.div 
                       animate={{ opacity: isActive ? 1 : 0.55 }} 
                       transition={{ duration: 0.3 }} 
                       className="flex flex-col items-center w-36 gap-0.5 mt-1.5"
                     >
                        <span className="text-[11px] font-black uppercase tracking-widest leading-none transition-colors" style={{ color: isActive ? "var(--theme-primary)" : "#fff" }}>
                           {nodeData.startYear}
                        </span>
                        
                        <MarqueeClubTitle text={nodeData.club} isActive={isActive} />
                        
                        {nodeData.team?.crestUrl && (
                          <div className={`mt-0.5 flex items-center justify-center gap-1.5 transition-all ${isActive ? 'drop-shadow-[0_0_10px_var(--theme-primary)] opacity-100' : 'opacity-40'}`}>
                             {nodeData.team?.countryCode && <CountryFlag code={nodeData.team.countryCode} className="w-5 h-4 object-cover rounded-[2px]" />}
                             <TeamCrest src={nodeData.team.crestUrl} size={isActive ? 52 : 36} />
                          </div>
                        )}
                     </motion.div>
                   </div>
                 )
               })}
            </div>

         </div>
      </motion.div>
    </div>
  );
}

// ------------------------------------------------------------
// TIMELINE SHARED LOGIC
// ------------------------------------------------------------

function prepareCardData(item: any, index: number) {
  const startYear = item.startDate ? new Date(item.startDate).getUTCFullYear() : '—';
  const endYear = item.endDate ? new Date(item.endDate).getUTCFullYear() : 'ACTUAL';
  
  const itemStats = item.stats || [];
  const itemHonours = item.honours || [];

  const totals = itemStats.reduce((acc: any, s: any) => {
    acc.matches += s.matches || 0;
    acc.goals += s.goals || 0;
    acc.assists += s.assists || 0;
    acc.minutesPlayed += s.minutes || 0;
    acc.startingMatches += s.starts || 0;
    return acc;
  }, { matches: 0, goals: 0, assists: 0, minutesPlayed: 0, startingMatches: 0 });

  const hasStats = totals.matches > 0 || totals.goals > 0 || totals.assists > 0 || totals.minutesPlayed > 0;

  return {
    ...item,
    startYear,
    endYear,
    isCurrent: index === 0 && !item.endDate,
    totals,
    hasStats,
    itemHonours,
    divisionData: item.divisionData || null,
    secondaryDivisionData: item.secondaryDivisionData || null
  };
}

function MobileTimelineCard({ nodeData, onSelectHonour }: { nodeData: any, onSelectHonour: (h: any) => void }) {
  const { club, division, divisionData, secondaryDivisionData, startYear, endYear, isCurrent, totals, hasStats, itemHonours, team } = nodeData;

  return (
    <div className="w-full bg-black/40 backdrop-blur-[40px] border border-white/10 ring-1 ring-white/5 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden shadow-[inset_0_0_60px_rgba(255,255,255,0.03)]">
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-[var(--theme-primary)] rounded-full blur-[80px] opacity-[0.1] pointer-events-none" />
        
        <span className={`inline-block px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest mb-4 relative z-10 ${isCurrent ? 'bg-[var(--theme-primary)] text-white shadow-[0_0_10px_var(--theme-primary)]' : 'bg-white/5 text-white/50'}`}>
           {startYear} - {endYear}
        </span>

        <div className="flex items-start justify-between relative z-10">
           <h4 className="text-2xl font-black text-white uppercase leading-[1.1] mb-1 pr-2 text-pretty">
              {club}
           </h4>
           {team?.crestUrl && (
              <Image src={team.crestUrl} alt={club} width={40} height={40} className="object-contain opacity-80 shrink-0 mt-1" />
           )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2 border-b border-white/[0.05] pb-4 relative z-10">
           {team?.countryCode && <CountryFlag code={team.countryCode} className="w-5 h-4 object-cover rounded-[2px]" />}
           {divisionData?.crestUrl && <TeamCrest src={divisionData.crestUrl} size={28} className="drop-shadow-md" />}
           <span className="text-white/40 font-bold uppercase tracking-widest text-[10px] truncate">
             {divisionData?.name || division || "División no especificada"}
           </span>
           {secondaryDivisionData?.name ? (
             <span className="inline-flex items-center gap-1 text-white/30 font-bold uppercase tracking-widest text-[9px] truncate before:content-['+'] before:text-white/30">
               {secondaryDivisionData.crestUrl ? <TeamCrest src={secondaryDivisionData.crestUrl} size={16} /> : null}
               <span>{secondaryDivisionData.name}</span>
             </span>
           ) : null}
        </div>

        {/* Stats — mobile mini card.
            Layout 2 + 3: fila 1 con PARTIDOS y TITULAR (la stat con donut
            necesita más aire, y partidos es su contraparte natural); fila 2
            con MINUTOS, GOLES y ASIST. El label "Titular" va dentro del donut
            (debajo del número) para no quedar desalineado verticalmente con
            los headers del resto de stats. */}
        {hasStats && (
          <div className="mt-5 grid grid-cols-6 gap-1 bg-black/40 rounded-2xl p-2 border border-white/5 overflow-hidden relative z-10">
             {/* Fila 1 — 2 datos (col-span-3 cada uno) */}
             <div className="col-span-3 flex flex-col items-center justify-center p-1">
               <span className="text-[8px] text-white/40 uppercase font-black tracking-widest text-center mb-1">Partidos</span>
               <CountUp value={totals.matches} className="text-xl text-white font-black leading-none" />
             </div>
             <div className="col-span-3 flex items-center justify-center p-1 border-l border-white/5">
               <div className="relative w-12 h-12 flex flex-col items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="2.5" fill="transparent" className="text-white/10" />
                    <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="2.5" fill="transparent"
                      strokeDasharray="94.24"
                      strokeDashoffset={94.24 - ((totals.matches > 0 ? Math.round((totals.startingMatches / totals.matches) * 100) : 0) / 100) * 94.24}
                      className="text-[#10b981] transition-all duration-1000 ease-out drop-shadow-[0_0_4px_rgba(16,185,129,0.4)]" strokeLinecap="round" />
                  </svg>
                  <CountUp value={totals.startingMatches} className="relative text-[12px] font-black text-white leading-none" />
                  <span className="relative text-[6px] font-black uppercase tracking-[0.18em] text-white/60 mt-0.5">Titular</span>
               </div>
             </div>
             {/* Fila 2 — 3 datos (col-span-2 cada uno) */}
             <div className="col-span-2 flex flex-col items-center justify-center p-1.5 border-t border-white/5">
               <span className="text-[8px] text-white/40 uppercase font-black tracking-widest text-center mb-1">Minutos</span>
               <span className="text-xl text-white font-black leading-none">
                 <CountUp value={totals.minutesPlayed} />
                 <span className="text-[9px] text-white/50 ml-0.5">&apos;</span>
               </span>
             </div>
             <div className="col-span-2 flex flex-col items-center justify-center p-1.5 border-t border-l border-white/5 bg-[var(--theme-accent)]/5">
               <span className="text-[8px] text-[var(--theme-accent)]/60 uppercase font-black tracking-widest text-center mb-1">Goles</span>
               <CountUp value={totals.goals} className="text-xl text-[var(--theme-accent)] font-black leading-none" />
             </div>
             <div className="col-span-2 flex flex-col items-center justify-center p-1.5 border-t border-l border-white/5 bg-[var(--theme-primary)]/5">
               <span className="text-[8px] text-[var(--theme-primary)]/60 uppercase font-black tracking-widest text-center mb-1">Asist.</span>
               <CountUp value={totals.assists} className="text-xl text-[var(--theme-primary)] font-black leading-none" />
             </div>
          </div>
        )}

        {/* Achievements */}
        {itemHonours.length > 0 && (
          <div className="mt-4 flex flex-col gap-1.5 max-h-[140px] overflow-y-auto scrollbar-hide relative z-10">
            {itemHonours.map((p: any) => {
               const isTrophy = isHonourTrophy(p.title);
               return (
               <div key={p.id} onClick={() => onSelectHonour(p)} className="group w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-lg cursor-pointer hover:bg-yellow-500/20 transition-colors">
                  <div className="flex flex-col truncate pr-2">
                    <span className="text-yellow-500 font-extrabold text-[10px] uppercase tracking-wider truncate group-hover:text-yellow-400 transition-colors">{p.title}</span>
                    {p.competition && <span className="text-yellow-500/50 text-[9px] font-bold uppercase truncate group-hover:text-yellow-500/80 transition-colors">{p.competition} {p.season && `• ${p.season}`}</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center justify-center w-6 h-6 shrink-0 rounded-full bg-yellow-500/20 text-yellow-500 text-[10px]">
                      {isTrophy ? (
                         <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15 8H9L12 2Z" /><path d="M19 8H5V10C5 13.866 8.13401 17 12 17C15.866 17 19 13.866 19 10V8Z" /><path d="M11 17V20H8V22H16V20H13V17H11Z" /><path d="M5 8C3.34315 8 2 9.34315 2 11C2 12.6569 3.34315 14 5 14V8Z" /><path d="M19 8C20.6569 8 22 9.34315 22 11C22 12.6569 20.6569 14 19 14V8Z" /></svg>
                      ) : (
                         <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      )}
                    </div>
                    <svg className="w-3.5 h-3.5 text-yellow-500/50 group-hover:text-yellow-500 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
               </div>
            )})}
          </div>
        )}

        {!hasStats && itemHonours.length === 0 && (
           <div className="mt-5 text-[10px] font-medium uppercase tracking-widest italic text-white/20">
             Sin registros oficiales
           </div>
        )}
    </div>
  );
}

function MarqueeClubTitle({ text, isActive }: { text: string; isActive: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldMarquee, setShouldMarquee] = useState(false);

  React.useEffect(() => {
    if (textRef.current && containerRef.current) {
      if (textRef.current.scrollWidth > containerRef.current.clientWidth) {
        setShouldMarquee(true);
      } else {
        setShouldMarquee(false);
      }
    }
  }, [text, isActive]);

  const xVal = shouldMarquee && textRef.current && containerRef.current 
    ? containerRef.current.clientWidth - textRef.current.scrollWidth - 12 
    : 0;

  return (
    <div ref={containerRef} className={`w-[125px] max-w-full overflow-hidden relative flex mt-1 mb-1 ${shouldMarquee ? 'justify-start text-left' : 'justify-center text-center'}`}>
      <motion.span 
        ref={textRef}
        animate={(shouldMarquee && isActive) ? { x: [0, xVal, 0] } : { x: 0 }}
        transition={{ duration: 4, ease: "linear", repeat: Infinity, repeatDelay: 1 }}
        className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap inline-block shrink-0"
        style={{ color: isActive ? "var(--theme-primary)" : "rgba(255,255,255,0.7)" }}
      >
        {text}
      </motion.span>
    </div>
  );
}

function HonourModal({ honour, onClose }: { honour: any, onClose: () => void }) {
  const isTrophy = isHonourTrophy(honour.title);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-6 relative shadow-2xl overflow-hidden"
      >
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-[var(--theme-primary)] rounded-full blur-[80px] opacity-20 pointer-events-none" />
        
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="flex items-center gap-4 mb-4 relative z-10">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 flex items-center justify-center border border-yellow-500/20 text-yellow-500 shrink-0 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            {isTrophy ? (
               <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15 8H9L12 2Z" /><path d="M19 8H5V10C5 13.866 8.13401 17 12 17C15.866 17 19 13.866 19 10V8Z" /><path d="M11 17V20H8V22H16V20H13V17H11Z" /><path d="M5 8C3.34315 8 2 9.34315 2 11C2 12.6569 3.34315 14 5 14V8Z" /><path d="M19 8C20.6569 8 22 9.34315 22 11C22 12.6569 20.6569 14 19 14V8Z" /></svg>
            ) : (
               <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            )}
          </div>
          <div className="flex-1 pr-4">
            <h4 className="text-xl font-black text-white uppercase leading-tight text-pretty">{honour.title}</h4>
            {(honour.competition || honour.season) && (
              <span className="text-yellow-500/80 text-xs font-bold uppercase tracking-widest mt-1 block">
                {honour.competition} {honour.season && `• ${honour.season}`}
              </span>
            )}
          </div>
        </div>

        {honour.description && (
          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/5 relative z-10">
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
              {honour.description}
            </p>
          </div>
        )}
        
        {honour.awardedOn && (
           <div className="mt-4 text-xs text-white/40 font-medium tracking-widest uppercase relative z-10">
              Otorgado: {new Date(honour.awardedOn).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
           </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function isHonourTrophy(title: string) {
  const t = title.toLowerCase();
  return t.includes('campeón') || t.includes('campeon') || t.includes('copa') || t.includes('oro') || t.includes('1er') || t.includes('primero') || t.includes('ganador') || t.includes('ascenso') || t.includes('trofeo') || t.includes('liga') || t.includes('champion') || t.includes('medalla');
}
