import Link from "next/link";
import { formatMarketValueEUR } from "@/lib/format";
import type { PublicProfileData } from "./LayoutResolver";

export default function MinimalistLayout({ data }: { data: PublicProfileData }) {
  const { player, career, media, sections, theme } = data;

  const isVisible = (sectionName: string) => {
    const s = sections.find(s => s.section === sectionName);
    return s ? s.visible : true;
  };

  const hasCareer = isVisible("career") && career.length > 0;
  const hasMedia = isVisible("media") && media.length > 0;

  return (
    <div className="bg-white min-h-screen text-neutral-900 w-full" style={{ backgroundColor: theme.primaryColor || "#ffffff", color: "#171717" }}>
      <div className="max-w-4xl mx-auto w-full px-6 py-16 md:py-32 space-y-32">
        
        {/* HERO SECTION */}
        {isVisible("hero") && (
          <section className="grid grid-cols-1 md:grid-cols-12 gap-12 items-end">
            <div className="col-span-1 md:col-span-8 flex flex-col gap-6">
              <h1 className="font-heading text-5xl md:text-8xl font-black tracking-tighter leading-none" style={{ color: "var(--color-accent)" }}>
                {player.fullName}
              </h1>
              
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold uppercase tracking-widest text-neutral-500">
                {player.positions && player.positions.length > 0 && (
                  <span>{player.positions.join(" / ")}</span>
                )}
                {player.currentClub && <span>{player.currentClub}</span>}
              </div>

              {player.bio && (
                <p className="font-body text-xl md:text-2xl font-light leading-relaxed max-w-2xl text-neutral-700 mt-4">
                  {player.bio}
                </p>
              )}
            </div>

            <div className="col-span-1 md:col-span-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={player.avatarUrl || "/images/player-default.jpg"}
                alt={player.fullName}
                className="w-full aspect-[3/4] object-cover bg-neutral-100 grayscale hover:grayscale-0 transition-all duration-700"
              />
            </div>
          </section>
        )}

        {/* DETAILS STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-y border-neutral-200">
           {player.nationality && player.nationality.length > 0 && (
             <div className="flex flex-col gap-2">
               <span className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">Nacionalidad</span>
               <span className="font-heading text-xl">{player.nationality[0]}</span>
             </div>
           )}
           {player.marketValueEur && (
             <div className="flex flex-col gap-2">
               <span className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">Valor Merc.</span>
               <span className="font-heading text-xl font-bold" style={{ color: "var(--color-accent)" }}>{formatMarketValueEUR(player.marketValueEur)}</span>
             </div>
           )}
           {player.foot && (
             <div className="flex flex-col gap-2">
               <span className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">Pierna Hábil</span>
               <span className="font-heading text-xl capitalize">{player.foot}</span>
             </div>
           )}
           <div className="flex flex-col gap-2">
             <span className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">Contacto</span>
             <span className="font-heading text-xl font-bold">Manager</span>
           </div>
        </div>

        {/* CAREER HISTORY SECTION */}
        {hasCareer && (
          <section>
            <h2 className="font-heading text-2xl font-bold uppercase tracking-widest mb-16 underline decoration-2 underline-offset-8" style={{ textDecorationColor: "var(--color-accent)" }}>
              Trayectoria
            </h2>

            <div className="space-y-0">
              {career.map((c, idx) => (
                <div key={c.id} className={`flex flex-col md:flex-row md:items-baseline gap-4 md:gap-16 py-8 ${idx !== 0 ? 'border-t border-neutral-200' : ''}`}>
                  <span className="font-body text-neutral-400 w-32 shrink-0 tabular-nums">
                    {c.startDate ? `${c.startDate}` : "..."} - {c.endDate ? `${c.endDate}` : "Hoy"}
                  </span>
                  <div>
                    <h3 className="font-heading text-2xl font-bold hover:text-[--color-accent] transition-colors">{c.club}</h3>
                    {c.division && <p className="text-neutral-500 mt-1 capitalize">{c.division}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* MULTIMEDIA SECTION */}
        {hasMedia && (
          <section>
            <h2 className="font-heading text-2xl font-bold uppercase tracking-widest mb-16 underline decoration-2 underline-offset-8" style={{ textDecorationColor: "var(--color-accent)" }}>
              Galería
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {media.map((m) => (
                <a key={m.id} href={m.url} target="_blank" className="block group w-full aspect-[4/5] overflow-hidden bg-neutral-100">
                  {m.type === "photo" ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all duration-700 hover:scale-105" alt="Media" />
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-200 group-hover:bg-neutral-300 transition-colors">
                      <span className="text-sm font-bold tracking-widest uppercase text-neutral-600">Ver Video</span>
                    </div>
                  )}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* AGENCY */}
        {isVisible("contact") && player.agency && (
          <section className="pt-16 pb-8 text-center border-t border-neutral-200">
             <p className="text-sm text-neutral-500 uppercase tracking-widest mb-4">Representación</p>
             <Link href={`/agency/${player.agency.slug}`} className="inline-block group">
               <h3 className="font-heading text-4xl font-black hover:text-[--color-accent] transition-colors">{player.agency.name}</h3>
             </Link>
          </section>
        )}

      </div>
    </div>
  );
}
