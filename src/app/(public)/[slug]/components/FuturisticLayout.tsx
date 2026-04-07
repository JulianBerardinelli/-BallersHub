import Link from "next/link";
import { formatMarketValueEUR } from "@/lib/format";
import type { PublicProfileData } from "./LayoutResolver";

export default function FuturisticLayout({ data }: { data: PublicProfileData }) {
  const { player, career, media, sections } = data;

  const isVisible = (sectionName: string) => {
    const s = sections.find(s => s.section === sectionName);
    return s ? s.visible : true; // Default true if not explicitly set
  };

  const hasCareer = isVisible("career") && career.length > 0;
  const hasMedia = isVisible("media") && media.length > 0;

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-12 md:py-24 space-y-24">
      
      {/* HERO SECTION */}
      {isVisible("hero") && (
        <section className="relative flex flex-col md:flex-row items-center gap-12 pt-8">
          {/* Neon Ring Avatar */}
          <div className="relative group shrink-0">
            <div className="absolute inset-0 bg-[var(--color-accent)] blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-700 rounded-full" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={player.avatarUrl || "/images/player-default.jpg"}
              alt={player.fullName}
              className="relative z-10 size-48 md:size-64 rounded-full object-cover border-4 border-transparent bg-clip-border"
              style={{ borderColor: "var(--color-accent)" }}
            />
          </div>

          <div className="flex flex-col text-center md:text-left gap-4">
             <h1 className="font-heading text-5xl md:text-7xl font-bold uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-400 drop-shadow-lg">
               {player.fullName}
             </h1>
             
             {player.positions && player.positions.length > 0 && (
               <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                 {player.positions.map((pos: string) => (
                    <span key={pos} className="px-4 py-1 rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)] uppercase tracking-widest text-xs font-bold shadow-[0_0_15px_var(--color-accent)]">
                      {pos}
                    </span>
                 ))}
               </div>
             )}

             {player.bio && (
               <p className="max-w-2xl text-neutral-300 font-body text-lg leading-relaxed mt-4">
                 {player.bio}
               </p>
             )}
             
             {/* Key Meta Stats Glass Panel */}
             <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
               {player.currentClub && (
                 <div className="flex flex-col gap-1 p-2">
                   <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Club Actual</span>
                   <span className="font-heading text-lg text-white truncate">{player.currentClub}</span>
                 </div>
               )}
               {player.nationality && player.nationality.length > 0 && (
                 <div className="flex flex-col gap-1 p-2">
                   <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Nacionalidad</span>
                   <span className="font-heading text-lg text-white">{player.nationality[0]}</span>
                 </div>
               )}
               {player.marketValueEur && (
                 <div className="flex flex-col gap-1 p-2">
                   <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Market Value</span>
                   <span className="font-heading text-lg text-[var(--color-accent)]">{formatMarketValueEUR(player.marketValueEur)}</span>
                 </div>
               )}
               {player.foot && (
                 <div className="flex flex-col gap-1 p-2">
                   <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Pierna Hábil</span>
                   <span className="font-heading text-lg text-white uppercase">{player.foot}</span>
                 </div>
               )}
             </div>
          </div>
        </section>
      )}

      {/* CAREER HISTORY SECTION */}
      {hasCareer && (
        <section className="relative">
          <div className="flex items-center gap-4 mb-12">
            <h2 className="font-heading text-3xl font-bold uppercase tracking-tight text-white">Trayectoria</h2>
            <div className="h-px bg-gradient-to-r from-[var(--color-accent)] to-transparent flex-1 opacity-50" />
          </div>

          <div className="grid gap-4">
            {career.map((c) => (
              <div key={c.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-xl bg-white/5 border border-white/10 hover:border-[var(--color-accent)] transition-colors group backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                  <span className="font-body text-neutral-500 text-sm w-24">
                    {c.startDate ? `${c.startDate}` : "-"} <br className="hidden md:block" />
                    {c.endDate ? `${c.endDate}` : "Presente"}
                  </span>
                  <div>
                    <h3 className="font-heading text-xl font-bold text-white group-hover:text-[var(--color-accent)] transition-colors">{c.club}</h3>
                    {c.division && <p className="text-sm text-neutral-400 capitalize">{c.division}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MULTIMEDIA SECTION */}
      {hasMedia && (
        <section className="relative">
          <div className="flex items-center gap-4 mb-12">
             <h2 className="font-heading text-3xl font-bold uppercase tracking-tight text-white">Multimedia</h2>
             <div className="h-px bg-gradient-to-r from-[var(--color-accent)] to-transparent flex-1 opacity-50" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {media.map((m) => (
              <a key={m.id} href={m.url} target="_blank" className="block group relative aspect-square overflow-hidden rounded-2xl bg-neutral-900 border border-white/10 hover:border-[var(--color-accent)]">
                {m.type === "photo" ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} className="object-cover w-full h-full opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" alt="Player Media" />
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <span className="w-16 h-16 rounded-full bg-[var(--color-accent)]/20 border border-[var(--color-accent)] flex items-center justify-center shadow-[0_0_30px_var(--color-accent)]">
                      ▶
                    </span>
                  </div>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* AGENCY / CONTACT */}
      {isVisible("contact") && player.agency && (
        <section className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 overflow-hidden backdrop-blur-xl">
           <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-accent)] blur-[100px] opacity-20" />
           <h2 className="font-heading text-2xl font-bold uppercase tracking-tight text-white mb-6">Representación Oficial</h2>
           <Link href={`/agency/${player.agency.slug}`} className="inline-flex items-center gap-4 group">
             <div className="size-16 rounded-full bg-neutral-900 border border-neutral-700 overflow-hidden flex items-center justify-center">
               <span className="text-xl font-bold text-white group-hover:text-[var(--color-accent)]">{player.agency.name.charAt(0)}</span>
             </div>
             <div>
               <h3 className="font-heading text-xl text-white group-hover:text-[var(--color-accent)] transition-colors">{player.agency.name}</h3>
               {player.agency.agentLicenseType && (
                 <p className="text-sm text-neutral-400 mt-1">Licencia: {player.agency.agentLicenseType}</p>
               )}
             </div>
           </Link>
        </section>
      )}
    </div>
  );
}
