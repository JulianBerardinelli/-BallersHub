import { CSSProperties, Suspense } from "react";
import FuturisticLayout from "./FuturisticLayout";
import MinimalistLayout from "./MinimalistLayout";
import VintageLayout from "./VintageLayout";
import ProAthleteLayout from "./ProAthleteLayout";
import { resolveTypographyClasses } from "./TypographyResolver";
import SmoothScrollProvider from "./SmoothScrollProvider";

// SSR Modules for Streaming
import ProfileBioModule from "./modules/ProfileBioModule";
import TacticsModule from "./modules/TacticsModule";
import CareerTimelineModule from "./modules/CareerTimelineModule";
import StatsAndMarketModule from "./modules/StatsAndMarketModule";
import MediaGalleryModule from "./modules/MediaGalleryModule";

export type PublicProfileData = {
  player: Record<string, unknown> & {
    id: string; // Used for fetching relations in modules
    fullName: string;
    avatarUrl?: string | null;
    heroUrl?: string | null;
    positions?: string[] | null;
    bio?: string | null;
    currentClub?: string | null;
    nationality?: string[] | null;
    marketValueEur?: number | null;
    foot?: string | null;
    agency?: { slug: string; name: string; agentLicenseType?: string | null } | null;
  };
  career: Array<Record<string, unknown> & { id: string; club: string; division?: string | null; startDate?: string | null; endDate?: string | null }>;
  media: Array<Record<string, unknown> & { id: string; url: string; type: string }>;
  sections: Array<{ section: string; visible: boolean }>;
  theme: Record<string, unknown> & { layout?: string | null; primaryColor?: string | null; accentColor?: string | null; typography?: string | null; };
  limits?: any; // Subscription limits
};

export default function LayoutResolver({ data }: { data: PublicProfileData }) {
  const { player, theme, limits } = data;
  
  const layout = theme?.layout || "futuristic";
  const primaryColor = theme?.primaryColor || "#0a0a0a";
  const accentColor = theme?.accentColor || "#10b981";
  
  const customStyles = {
    "--color-primary": primaryColor,
    "--color-accent": accentColor,
    backgroundColor: "var(--color-primary)",
    color: "#ffffff"
  } as CSSProperties;

  const fontClasses = resolveTypographyClasses(theme?.typography as string | null);

  return (
    <SmoothScrollProvider>
      <div style={customStyles} className={`min-h-screen w-full relative ${fontClasses} font-body pb-20 selection:bg-[var(--color-accent)] selection:text-black`}>
        {/* Background glow base */}
        {layout === "futuristic" && (
          <div className="fixed inset-0 pointer-events-none opacity-20">
             <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[var(--color-accent)] blur-[150px] rounded-full mix-blend-screen" />
             <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-[var(--color-accent)] blur-[250px] rounded-full mix-blend-screen opacity-50" />
          </div>
        )}
        
        {/* Layout Switcher */}
        <div className="relative z-10 w-full">
           {layout === "futuristic" && <FuturisticLayout data={data} />}
           {layout === "minimalist" && <MinimalistLayout data={data} />}
           {layout === "vintage" && <VintageLayout data={data} />}
           {layout === "pro" && (
             <ProAthleteLayout data={data}>
               {/* 
                 Streaming Async Server Components: 
                 These block load independently from the Hero, heavily improving TTFB 
               */}
               <Suspense fallback={<div className="h-40 flex items-center justify-center text-white/30 animate-pulse">Cargando biografía...</div>}>
                 <ProfileBioModule playerId={player.id} />
               </Suspense>

               <Suspense fallback={<div className="h-40 flex items-center justify-center text-white/30 animate-pulse">Cargando Tácticas...</div>}>
                 <TacticsModule playerId={player.id} />
               </Suspense>

               <Suspense fallback={<div className="h-40 flex items-center justify-center text-white/30 animate-pulse">Cargando carrera...</div>}>
                 <CareerTimelineModule playerId={player.id} />
               </Suspense>

               <Suspense fallback={<div className="h-40 flex items-center justify-center text-white/30 animate-pulse">Cargando estadísticas...</div>}>
                 <StatsAndMarketModule playerId={player.id} />
               </Suspense>

               <Suspense fallback={<div className="h-40 flex items-center justify-center text-white/30 animate-pulse">Cargando media...</div>}>
                 <MediaGalleryModule playerId={player.id} limits={limits} />
               </Suspense>
             </ProAthleteLayout>
           )}
        </div>
      </div>
    </SmoothScrollProvider>
  );
}
