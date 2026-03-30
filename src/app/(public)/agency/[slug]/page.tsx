import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { agencyProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { 
  ArrowLeft, 
  ExternalLink, 
  MapPin, 
  Calendar, 
  Globe, 
  Instagram, 
  Twitter, 
  Linkedin,
  Award
} from "lucide-react";
import { formatMarketValueEUR } from "@/lib/format";
import CountryFlag from "@/components/common/CountryFlag";

export const revalidate = 3600;
type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  
  if (!slug) return { title: "Agencia no encontrada" };
  
  const agency = await db.query.agencyProfiles.findFirst({
    where: eq(agencyProfiles.slug, slug),
    columns: { name: true, description: true },
  });

  if (!agency) return { title: "Agencia no encontrada" };

  const title = `Agencia ${agency.name} | BallersHub`;
  const description = agency.description?.slice(0, 160) ?? `Perfil oficial de la agencia de representación ${agency.name} en BallersHub`;

  return {
    title,
    description,
    openGraph: { title, description, url: `/agency/${slug}`, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function AgencyPublicPage({ params }: { params: Params }) {
  const { slug } = await params;
  
  if (!slug) return notFound();

  const agency = await db.query.agencyProfiles.findFirst({
    where: eq(agencyProfiles.slug, slug),
    with: {
      players: {
        where: (p, { eq }) => eq(p.visibility, "public"),
      }
    }
  });

  if (!agency) return notFound();

  const players = agency.players;

  // Render format for operative countries
  const dnEs = new Intl.DisplayNames(["es"], { type: "region", fallback: "code" });
  
  // Safe cast for licenses since it comes back as json from drizzle
  const licenses = (agency.licenses as Array<{type: string, number: string, url: string}>) || [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <Link href="/" className="inline-flex items-center text-sm font-medium text-neutral-400 hover:text-white mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Link>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {agency.logoUrl ? (
          <img
            src={agency.logoUrl}
            alt={`Logo de ${agency.name}`}
            className="w-32 h-32 md:w-48 md:h-48 rounded-2xl object-contain bg-neutral-900 border border-neutral-800 shadow-xl shrink-0"
          />
        ) : (
          <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl shrink-0 flex items-center justify-center text-neutral-500 font-medium text-4xl uppercase tracking-wider">
            {agency.name.slice(0, 2)}
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-6">
          <header>
            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-3">
              {agency.name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-neutral-300">
              {agency.headquarters && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-neutral-500" />
                  <span>{agency.headquarters}</span>
                </div>
              )}
              {agency.foundationYear && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-neutral-500" />
                  <span>Fundada en {agency.foundationYear}</span>
                </div>
              )}
            </div>
          </header>

          <div className="flex flex-wrap gap-4">
             {/* Dynamic Licenses */}
             {licenses.map((lic, idx) => (
                <div key={idx} className="flex items-center gap-2 border border-neutral-700/50 bg-neutral-900/60 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  <Award className="h-4 w-4 text-primary" />
                  <span>{lic.type}</span>
                  <span className="text-neutral-500 px-1">•</span>
                  <span className="text-neutral-400">{lic.number}</span>
                  {lic.url && (
                    <a href={lic.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:text-white">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
             ))}

             {/* Legacy License Format (Fallback if arrays are missing) */}
             {licenses.length === 0 && agency.agentLicenseType && (
                <div className="flex items-center gap-2 border border-neutral-700/50 bg-neutral-800/50 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  <Award className="h-4 w-4 text-primary" />
                  <span>Licencia {agency.agentLicenseType}</span>
                </div>
             )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Website / Verification URLs */}
            {agency.websiteUrl && (
              <a href={agency.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-primary hover:border-primary transition-colors">
                <Globe className="h-4 w-4" />
              </a>
            )}
            
            {agency.instagramUrl && (
              <a href={agency.instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-pink-500 hover:border-pink-500 transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
            )}

            {agency.twitterUrl && (
              <a href={agency.twitterUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-sky-500 hover:border-sky-500 transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
            )}

            {agency.linkedinUrl && (
              <a href={agency.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-blue-600 hover:border-blue-600 transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
            )}
            
            {agency.verifiedLink && !agency.websiteUrl?.includes(agency.verifiedLink) && (
              <a href={agency.verifiedLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm ml-2 bg-neutral-800/50 px-3 py-1.5 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors">
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Validación Oficial
              </a>
            )}
          </div>

          {agency.operativeCountries && agency.operativeCountries.length > 0 && (
             <div className="pt-4 border-t border-neutral-800/60">
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-3">Alcance Operativo</h4>
                <div className="flex flex-wrap gap-2">
                   {agency.operativeCountries.map(code => (
                     <div key={code} className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded text-xs font-medium text-neutral-300">
                        <CountryFlag code={code} size={14} />
                        {dnEs.of(code) ?? code}
                     </div>
                   ))}
                </div>
             </div>
          )}

          {agency.description && (
             <div className="pt-4 border-t border-neutral-800/60 prose prose-invert prose-sm max-w-none text-neutral-300">
               <p className="whitespace-pre-wrap leading-relaxed">{agency.description}</p>
             </div>
          )}
        </div>
      </div>

      <div className="h-px w-full bg-neutral-800 my-8" />

      <section>
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold text-white tracking-tight">Roster de Jugadores</h2>
          <span className="text-sm font-medium text-neutral-500">{players.length} {players.length === 1 ? 'jugador' : 'jugadores'}</span>
        </div>

        {players.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {players.map((player) => (
              <Link key={player.id} href={`/${player.slug}`} className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50 transition-all hover:bg-neutral-800 hover:border-neutral-700 flex flex-col h-full">
                <div className="aspect-[4/3] w-full bg-neutral-950 overflow-hidden relative">
                  <img
                    src={player.avatarUrl || "/images/player-default.jpg"}
                    alt={player.fullName}
                    className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                     <div>
                       <h3 className="font-semibold text-white truncate text-shadow-sm">{player.fullName}</h3>
                       {player.positions && player.positions.length > 0 && (
                          <p className="text-xs text-neutral-300 uppercase tracking-wider font-medium truncate mt-0.5">
                            {player.positions[0]}
                          </p>
                       )}
                     </div>
                  </div>
                </div>
                
                <div className="p-3 text-sm flex-1 flex flex-col justify-between">
                   <div className="space-y-1 mb-3">
                     {player.currentClub && (
                        <div className="flex justify-between items-center text-neutral-400">
                           <span>Club actual</span>
                           <span className="text-white text-right font-medium truncate max-w-[120px]" title={player.currentClub}>{player.currentClub}</span>
                        </div>
                     )}
                     {player.nationality && player.nationality.length > 0 && (
                        <div className="flex justify-between items-center text-neutral-400">
                           <span>Nacionalidad</span>
                           <span className="flex items-center gap-1.5 text-white text-right truncate">
                              <CountryFlag code={player.nationality[0]} size={12} />
                              {dnEs.of(player.nationality[0]) ?? player.nationality[0]}
                           </span>
                        </div>
                     )}
                   </div>
                   
                   {player.marketValueEur && (
                      <div className="pt-2 border-t border-neutral-800 flex justify-between items-center">
                         <span className="text-xs text-neutral-500 font-medium tracking-wide">VALOR REGLAMENTARIO</span>
                         <span className="font-semibold text-primary">{formatMarketValueEUR(player.marketValueEur)}</span>
                      </div>
                   )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-900/20 py-24 text-center">
            <div className="mb-4 rounded-full bg-neutral-800/50 p-4">
              <svg className="h-8 w-8 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="mb-1 text-lg font-semibold text-white">Sin jugadores públicos</h3>
            <p className="max-w-md text-sm text-neutral-400">
              Esta agencia aún no cuenta con jugadores con perfil público configurado en su roster.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
