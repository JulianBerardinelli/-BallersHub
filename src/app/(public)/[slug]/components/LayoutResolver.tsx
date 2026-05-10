import { CSSProperties, Suspense } from "react";
import ProAthleteLayout from "./ProAthleteLayout";
import FreeLayout, {
  type FreeLayoutCareerRow,
  type FreeLayoutPersonal,
  type FreeLayoutPlayer,
} from "./free/FreeLayout";
import SmoothScrollProvider from "./SmoothScrollProvider";
import PortfolioFooter from "@/components/layout/footer/PortfolioFooter";

// SSR Modules for Streaming
import ProfileBioModule from "./modules/ProfileBioModule";
import TacticsModule from "./modules/TacticsModule";
import CareerTimelineModule from "./modules/CareerTimelineModule";
import MediaGalleryModule from "./modules/MediaGalleryModule";
import ProfilePressNotesModule from "./modules/ProfilePressNotesModule";
import ContactPortfolioModule from "./modules/ContactPortfolioModule";

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
    agency?: { slug: string; name: string } | null;
  };
  career: Array<Record<string, unknown> & { id: string; club: string; division?: string | null; startDate?: string | null; endDate?: string | null }>;
  media: Array<Record<string, unknown> & { id: string; url: string; type: string }>;
  articles?: Array<Record<string, unknown> & { id: string; title: string; url: string; imageUrl?: string | null }>;
  sections: Array<{ section: string; visible: boolean }>;
  theme: Record<string, unknown> & { layout?: string | null; primaryColor?: string | null; accentColor?: string | null; typography?: string | null; };
  limits?: any; // Subscription limits
  /**
   * Subscription tier from `subscriptions.plan`. When `'free'` (or
   * undefined), the resolver picks the editorial-dossier FreeLayout
   * regardless of `theme.layout`. Pro variants only render for paying
   * users.
   */
  plan?: "free" | "pro" | "pro_plus" | null;
  /**
   * Pre-fetched data needed by the Free layout. Only populated when
   * `plan === 'free'` in `page.tsx`. The Pro layout's modules fetch
   * their own data lazily via Suspense, so they don't use this.
   */
  freeData?: {
    personal: FreeLayoutPersonal;
    career: FreeLayoutCareerRow[];
  } | null;
};

export default function LayoutResolver({ data }: { data: PublicProfileData }) {
  const { player, theme, limits, articles, plan, freeData } = data;

  // Free-tier players ALWAYS get the editorial dossier, regardless of
  // whatever `theme.layout` they had selected. The pro variants are
  // gated behind the subscription.
  const isFree = !plan || plan === "free";
  if (isFree) {
    const freePlayer: FreeLayoutPlayer = {
      id: player.id,
      slug: (player as { slug?: string }).slug ?? "",
      fullName: player.fullName,
      bio: player.bio ?? null,
      avatarUrl: player.avatarUrl ?? null,
      birthDate:
        ((player as { birthDate?: string | null }).birthDate as string | null) ??
        null,
      heightCm:
        ((player as { heightCm?: number | null }).heightCm as number | null) ??
        null,
      weightKg:
        ((player as { weightKg?: number | null }).weightKg as number | null) ??
        null,
      foot: player.foot ?? null,
      positions: player.positions ?? null,
      nationality: player.nationality ?? null,
      nationalityCodes:
        ((player as { nationalityCodes?: string[] | null }).nationalityCodes as
          | string[]
          | null) ?? null,
      currentClub: player.currentClub ?? null,
      transfermarktUrl:
        ((player as { transfermarktUrl?: string | null }).transfermarktUrl as
          | string
          | null) ?? null,
      beSoccerUrl:
        ((player as { beSoccerUrl?: string | null }).beSoccerUrl as
          | string
          | null) ?? null,
    };
    return (
      <FreeLayout
        data={{
          player: freePlayer,
          personal: freeData?.personal ?? null,
          career: freeData?.career ?? [],
        }}
      />
    );
  }

  // Pro tier always renders the Pro Athlete layout. Legacy `theme.layout`
  // values (`futuristic`, `minimalist`, `vintage`) are ignored — the column
  // is preserved in DB but no longer respected (see
  // `project_dashboard_plan_gating.md`).
  const primaryColor = theme?.primaryColor || "#0a0a0a";
  const accentColor = theme?.accentColor || "#10b981";
  const backgroundColor = (theme as Record<string, unknown>)?.backgroundColor as string | undefined;
  const secondaryColor = (theme as Record<string, unknown>)?.secondaryColor as string | undefined;
  const playerSlug = (player as Record<string, unknown>)?.slug as string | undefined;

  // The pro layout's inner module wrapper paints its own `--theme-background`,
  // which can differ from `--color-primary`. Match the body bg to the pro
  // background so the page ends in a single, consistent color.
  const bodyBg = backgroundColor ?? primaryColor;

  const customStyles = {
    "--color-primary": primaryColor,
    "--color-accent": accentColor,
    backgroundColor: bodyBg,
    color: "#ffffff"
  } as CSSProperties;

  return (
    <SmoothScrollProvider>
      <div style={customStyles} className="min-h-screen w-full relative font-body pb-20 selection:bg-[var(--color-accent)] selection:text-black">
        <div className="relative z-10 w-full">
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

            {/* Press & Notes Module (Client Side) */}
            <ProfilePressNotesModule articles={articles as any} />

            <Suspense fallback={<div className="h-40 flex items-center justify-center text-white/30 animate-pulse">Cargando media...</div>}>
              <MediaGalleryModule playerId={player.id} playerName={player.fullName} avatarUrl={player.avatarUrl ?? null} limits={limits} />
            </Suspense>

            <Suspense fallback={null}>
              <ContactPortfolioModule
                playerId={player.id}
                playerSlug={(playerSlug ?? "") as string}
                playerName={player.fullName}
              />
            </Suspense>
          </ProAthleteLayout>
        </div>
      </div>

      {/*
        Portfolio footer — sits below the themed wrapper so the layout's
        pb-20 / parallax / mix-blend-mode cannot affect it. Background is
        matched to bodyBg so there is no color seam.
      */}
      <PortfolioFooter
        ownerKind="player"
        ownerName={player.fullName}
        ownerSlug={playerSlug}
        backgroundColor={bodyBg}
        primaryColor={accentColor}
        secondaryColor={secondaryColor || primaryColor}
        accentColor={accentColor}
      />
    </SmoothScrollProvider>
  );
}
