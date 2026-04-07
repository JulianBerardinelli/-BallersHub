
import { formatMarketValueEUR } from "@/lib/format";
import type { PublicProfileData } from "./LayoutResolver";

export default function VintageLayout({ data }: { data: PublicProfileData }) {
  const { player, career, media, sections, theme } = data;

  const isVisible = (sectionName: string) => {
    const s = sections.find(s => s.section === sectionName);
    return s ? s.visible : true;
  };

  const hasCareer = isVisible("career") && career.length > 0;
  const hasMedia = isVisible("media") && media.length > 0;

  return (
    <div className="min-h-screen text-amber-950 w-full" style={{ backgroundColor: theme.primaryColor || "#fcf9f2", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")` }}>
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-12 md:py-20">
        
        {/* Newspaper Header */}
        <header className="border-b-4 border-double border-amber-900/40 pb-6 mb-12 text-center flex flex-col items-center gap-4">
          <p className="font-body text-sm font-bold tracking-widest uppercase opacity-70">
            Official Player Profile
          </p>
          <h1 className="font-heading text-6xl md:text-8xl font-black uppercase text-amber-950 tracking-tighter" style={{ color: "var(--color-accent)" }}>
            {player.fullName}
          </h1>
          <div className="w-full flex justify-between items-center px-4 pt-4 border-t border-amber-900/20 font-serif text-sm italic opacity-80">
            <span>{player.nationality?.[0] || 'International'}</span>
            <span>Est. {new Date().getFullYear()}</span>
            <span>{player.positions?.join(", ") || 'Player'}</span>
          </div>
        </header>

        {/* HERO GRID */}
        {isVisible("hero") && (
          <section className="grid md:grid-cols-12 gap-8 md:gap-12 mb-20">
            <div className="md:col-span-5 relative">
              {/* Torn photo effect container */}
              <div className="p-3 bg-[#f5f1e6] border border-amber-900/20 shadow-md rotate-[-2deg]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={player.avatarUrl || "/images/player-default.jpg"}
                  alt={player.fullName}
                  className="w-full aspect-[4/5] object-cover sepia-[.3] contrast-125 hover:sepia-0 transition-all duration-700 border border-amber-900/10"
                />
              </div>
            </div>

            <div className="md:col-span-7 flex flex-col justify-center">
              <h2 className="font-heading text-3xl font-bold mb-6 text-amber-900 border-b border-amber-900/30 pb-2 inline-block">Resumen Profesional</h2>
              
              {player.bio && (
                <p className="font-serif text-lg leading-relaxed text-amber-950/80 mb-8 first-letter:text-5xl first-letter:font-heading first-letter:float-left first-letter:mr-2">
                  {player.bio}
                </p>
              )}

              <div className="p-6 border-2 border-dashed border-amber-900/30 bg-[#fbf8f1]">
                <h3 className="font-heading text-sm uppercase tracking-widest mb-4 text-center opacity-60">Ficha Técnica</h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8 font-mono text-sm">
                  {player.currentClub && (
                    <div className="flex justify-between border-b border-amber-900/10 pb-1">
                      <span className="opacity-60">DOMICILIO </span>
                      <span className="font-bold">{player.currentClub}</span>
                    </div>
                  )}
                  {player.foot && (
                    <div className="flex justify-between border-b border-amber-900/10 pb-1">
                      <span className="opacity-60">LATERALIDAD</span>
                      <span className="font-bold capitalize">{player.foot}</span>
                    </div>
                  )}
                  {player.marketValueEur && (
                    <div className="flex justify-between border-b border-amber-900/10 pb-1 col-span-2">
                      <span className="opacity-60">TASACIÓN</span>
                      <span className="font-bold">{formatMarketValueEUR(player.marketValueEur)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="grid md:grid-cols-12 gap-12">
          
          {/* CAREER HISTORY SECTION (Left Column) */}
          {hasCareer && (
            <div className="md:col-span-7">
              <h2 className="font-heading text-3xl font-bold mb-8 text-amber-900 border-b-2 border-amber-900/20 pb-2">Registros de Carrera</h2>
              <div className="flex flex-col gap-6">
                {career.map((c) => (
                  <div key={c.id} className="relative pl-6 border-l-2 border-amber-900/20 py-2">
                    <div className="absolute w-3 h-3 bg-[#fcf9f2] border-2 border-amber-900/40 rounded-full -left-[7.5px] top-4" />
                    <span className="font-mono text-sm text-amber-900/60 block mb-1">
                      {c.startDate || "N/A"} — {c.endDate || "Presente"}
                    </span>
                    <h3 className="font-heading text-2xl font-bold">{c.club}</h3>
                    {c.division && <p className="font-serif italic text-amber-950/70">{c.division}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MULTIMEDIA (Right Column) */}
          {hasMedia && (
            <div className="md:col-span-5">
               <h2 className="font-heading text-3xl font-bold mb-8 text-amber-900 border-b-2 border-amber-900/20 pb-2">Archivo Gráfico</h2>
               <div className="flex flex-col gap-6">
                 {media.slice(0, 3).map((m) => ( // Show fewer in vintage layout sidebar
                   <a key={m.id} href={m.url} target="_blank" className="block relative p-2 bg-white border border-amber-900/20 shadow-sm rotate-1 hover:rotate-0 transition-transform">
                     {m.type === "photo" ? (
                       <>
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img src={m.url} className="w-full aspect-[4/3] object-cover sepia-[.4] contrast-150" alt="Archivo Gráfico" />
                       </>
                     ) : (
                       <div className="w-full aspect-[4/3] bg-amber-900/10 flex items-center justify-center border border-amber-900/20">
                         <span className="font-heading tracking-widest text-sm opacity-60">► CINTA DE VIDEO</span>
                       </div>
                     )}
                   </a>
                 ))}
               </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
