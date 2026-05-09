import { CSSProperties, Suspense } from "react";
import ClassicAgencyLayout from "./ClassicAgencyLayout";
import ProAgencyLayout from "./ProAgencyLayout";
import { resolveTypographyClasses } from "../../../[slug]/components/TypographyResolver";
import SmoothScrollProvider from "../../../[slug]/components/SmoothScrollProvider";
import PortfolioFooter from "@/components/layout/footer/PortfolioFooter";

import AgencyAboutModule from "./modules/AgencyAboutModule";
import AgencyRosterModule from "./modules/AgencyRosterModule";
import AgencyReachModule from "./modules/AgencyReachModule";
import AgencyServicesModule from "./modules/AgencyServicesModule";
import AgencyStaffModule from "./modules/AgencyStaffModule";
import AgencyGalleryModule from "./modules/AgencyGalleryModule";
import AgencyContactModule from "./modules/AgencyContactModule";

export type AgencyPlayerCard = {
  id: string;
  slug: string;
  fullName: string;
  avatarUrl?: string | null;
  positions?: string[] | null;
  currentClub?: string | null;
  nationality?: string[] | null;
  marketValueEur?: number | null;
  currentTeamCountryCode?: string | null;
};

export type AgencyPublicData = {
  agency: {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    logoUrl?: string | null;
    tagline?: string | null;
    headquarters?: string | null;
    foundationYear?: number | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    websiteUrl?: string | null;
    verifiedLink?: string | null;
    instagramUrl?: string | null;
    twitterUrl?: string | null;
    linkedinUrl?: string | null;
    operativeCountries?: string[] | null;
    services?: Array<{
      title: string;
      icon: string;
      color: string | null;
      description: string | null;
    }> | null;
  };
  players: AgencyPlayerCard[];
  staffLicenses: Array<{
    managerId: string;
    managerName: string;
    licenses: Array<{ type: string; number: string; url?: string }>;
  }>;
  countryProfiles: Array<{
    countryCode: string;
    description: string | null;
  }>;
  teamRelations: Array<{
    id: string;
    relationKind: string;
    description: string | null;
    countryCode: string | null;
    team: {
      id: string;
      slug: string;
      name: string;
      country: string | null;
      countryCode: string | null;
      crestUrl: string;
      transfermarktUrl: string | null;
    };
  }>;
  sections: Array<{ section: string; visible: boolean }>;
  theme: {
    layout?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    backgroundColor?: string | null;
    typography?: string | null;
    heroHeadline?: string | null;
    heroTagline?: string | null;
  };
};

export default function AgencyLayoutResolver({ data }: { data: AgencyPublicData }) {
  const { agency, theme } = data;

  const layout = theme?.layout || "classic";
  const primaryColor = theme?.primaryColor || "#0a0a0a";
  const accentColor = theme?.accentColor || "#10b981";
  const secondaryColor = theme?.secondaryColor || "#2A2A2A";
  const backgroundColor = theme?.backgroundColor || "#050505";

  const bodyBg = layout === "pro" ? backgroundColor : primaryColor;

  const customStyles = {
    "--color-primary": primaryColor,
    "--color-accent": accentColor,
    backgroundColor: bodyBg,
    color: "#ffffff",
  } as CSSProperties;

  const fontClasses = resolveTypographyClasses(theme?.typography ?? null);

  return (
    <SmoothScrollProvider>
      <div
        style={customStyles}
        className={`min-h-screen w-full relative ${fontClasses} font-body pb-20 selection:bg-[var(--color-accent)] selection:text-black`}
      >
        <div className="relative z-10 w-full">
          {layout === "classic" && <ClassicAgencyLayout data={data} />}
          {layout === "pro" && (
            <ProAgencyLayout data={data}>
              <Suspense fallback={<div className="h-40 flex items-center justify-center text-white/30 animate-pulse">Cargando agencia...</div>}>
                <AgencyAboutModule
                  agency={agency}
                  playersCount={data.players.length}
                  staffLicenses={data.staffLicenses}
                  sections={data.sections}
                />
              </Suspense>

              <Suspense fallback={<div className="h-40 flex items-center justify-center text-white/30 animate-pulse">Cargando equipo...</div>}>
                <AgencyStaffModule agencyId={agency.id} sections={data.sections} />
              </Suspense>

              <Suspense fallback={<div className="h-40 flex items-center justify-center text-white/30 animate-pulse">Cargando roster...</div>}>
                <AgencyRosterModule agencyId={agency.id} sections={data.sections} />
              </Suspense>

              <Suspense fallback={null}>
                <AgencyServicesModule services={agency.services ?? null} sections={data.sections} />
              </Suspense>

              <Suspense fallback={null}>
                <AgencyReachModule
                  countries={agency.operativeCountries ?? null}
                  countryProfiles={data.countryProfiles}
                  teamRelations={data.teamRelations}
                  players={data.players}
                  sections={data.sections}
                />
              </Suspense>

              <Suspense fallback={<div className="h-40 flex items-center justify-center text-white/30 animate-pulse">Cargando galería...</div>}>
                <AgencyGalleryModule agencyId={agency.id} sections={data.sections} />
              </Suspense>

              <Suspense fallback={null}>
                <AgencyContactModule agency={agency} sections={data.sections} />
              </Suspense>
            </ProAgencyLayout>
          )}
        </div>
      </div>

      <PortfolioFooter
        ownerKind="agency"
        ownerName={agency.name}
        ownerSlug={agency.slug}
        backgroundColor={bodyBg}
        primaryColor={accentColor}
        secondaryColor={secondaryColor || primaryColor}
        accentColor={accentColor}
      />
    </SmoothScrollProvider>
  );
}
