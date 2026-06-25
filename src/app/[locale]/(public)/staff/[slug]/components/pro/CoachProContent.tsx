"use client";

// Scrolling body of the Pro coach portfolio. This is now a thin WRAPPER: it
// receives the already-loaded coach data (the page fetches it once) and renders
// the rich modules in order, each fed only the slice of CoachProData it needs +
// the theme accent. The modules themselves own their markup/animations and
// reuse the player's agnostic components where possible (bio background,
// gallery, press cards, contact lead-gating).
//
// Section ids (for the ProCoachHeader scroll-spy):
//   #biography → #career → #tactics → #gallery → #press → #honours → #contact
//
// Each module no-ops on empty data, so the order stays stable regardless of how
// complete a given coach's profile is. Press renders ONLY when articles exist
// (owner decision) — the page always passes the array; the module guards.

import type { CoachProData } from "./ProCoachLayout";
import CoachBioModule from "./modules/CoachBioModule";
import CoachCareerTimelineModule from "./modules/CoachCareerTimelineModule";
import StaffMethodologyModule from "./modules/StaffMethodologyModule";
import CoachTacticsModule from "./modules/CoachTacticsModule";
import CoachMediaGalleryModule from "./modules/CoachMediaGalleryModule";
import CoachPressNotesModule from "./modules/CoachPressNotesModule";
import CoachHonoursLicensesModule from "./modules/CoachHonoursLicensesModule";
import CoachContactModule from "./modules/CoachContactModule";

export default function CoachProContent({ data, accent }: { data: CoachProData; accent: string }) {
  const photos = data.media.filter((m) => m.type === "photo");
  const videos = data.media.filter((m) => m.type === "video");

  return (
    <>
      <CoachBioModule
        bio={data.bio}
        accent={accent}
        fullName={data.fullName}
        roleTitle={data.roleDisplay ?? data.roleTitle}
        avatarUrl={data.avatarUrl}
        nationalityCodes={data.nationalityCodes}
        currentClub={data.currentClub}
        coachingSince={data.coachingSince}
        preferredFormations={data.preferredFormations}
        personalDetails={data.personalDetails}
        links={data.links}
      />

      <CoachCareerTimelineModule career={data.career} stats={data.stats} accent={accent} />

      {/* Metodología — universal (todos los oficios). No-op si no hay rubros. */}
      <StaffMethodologyModule rubros={data.methodology} accent={accent} />

      {/* Ideas de juego / metodología táctica: sólo DT (o perfiles sin rol aún). */}
      {data.showTactical && (
        <CoachTacticsModule
          methodologyAnalysis={data.methodologyAnalysis}
          playingStyle={data.playingStyle}
          preferredFormations={data.preferredFormations}
          videos={videos}
          accent={accent}
        />
      )}

      <CoachMediaGalleryModule photos={photos} coachName={data.fullName} />

      {/* Press notes — rendered only when there are articles (owner decision). */}
      {data.articles.length > 0 && <CoachPressNotesModule articles={data.articles} />}

      <CoachHonoursLicensesModule
        licenses={data.licenses}
        honours={data.honours}
        accent={accent}
      />

      <CoachContactModule
        coachSlug={data.slug}
        coachName={data.fullName}
        ownerEmail={data.ownerEmail}
        personalDetails={data.personalDetails}
      />
    </>
  );
}
