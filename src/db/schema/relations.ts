// Relations (opcionales)
import { relations } from "drizzle-orm";
import { playerProfiles } from "./players";
import { teams } from "./teams";
import { playerMedia, playerArticles } from "./media";
import { careerItems } from "./career";
import { statsSeasons } from "./stats";
import { reviewInvitations } from "./invitations";
import { reviews } from "./reviews";
import { reviewerProfiles } from "./reviewerProfiles";
import { reviewerPermissions } from "./reviewerPermissions";
import { playerPersonalDetails } from "./personalDetails";
import { profileChangeLogs } from "./profileChangeLogs";
import { agencyProfiles } from "./agencies";
import { userProfiles } from "./users";
import { managerApplications } from "./managerApplications";
import { agencyInvites } from "./agencyInvites";
import { managerProfiles } from "./managerProfiles";
import { divisions } from "./divisions";
import { countries } from "./countries";

export const playerProfilesRelations = relations(playerProfiles, ({ one, many }) => ({
  currentTeam: one(teams, {
    fields: [playerProfiles.currentTeamId],
    references: [teams.id],
  }),
  media: many(playerMedia),
  articles: many(playerArticles),
  career: many(careerItems),
  seasons: many(statsSeasons),
  invitations: many(reviewInvitations),
  reviews: many(reviews),
  reviewerPermissions: many(reviewerPermissions),
  personalDetails: one(playerPersonalDetails, {
    fields: [playerProfiles.id],
    references: [playerPersonalDetails.playerId],
  }),
  changeLogs: many(profileChangeLogs),
  agency: one(agencyProfiles, {
    fields: [playerProfiles.agencyId],
    references: [agencyProfiles.id],
  }),
}));
export const reviewerProfilesRelations = relations(reviewerProfiles, ({ many }) => ({
  reviews: many(reviews),
  permissions: many(reviewerPermissions),
}));

export const playerPersonalDetailsRelations = relations(playerPersonalDetails, ({ one }) => ({
  player: one(playerProfiles, {
    fields: [playerPersonalDetails.playerId],
    references: [playerProfiles.id],
  }),
}));

export const profileChangeLogsRelations = relations(profileChangeLogs, ({ one }) => ({
  player: one(playerProfiles, {
    fields: [profileChangeLogs.playerId],
    references: [playerProfiles.id],
  }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one, many }) => ({
  agency: one(agencyProfiles, {
    fields: [userProfiles.agencyId],
    references: [agencyProfiles.id],
  }),
  sentInvites: many(agencyInvites),
  managerProfile: one(managerProfiles, {
    fields: [userProfiles.id],
    references: [managerProfiles.userId],
  }),
}));

export const managerProfilesRelations = relations(managerProfiles, ({ one }) => ({
  user: one(userProfiles, {
    fields: [managerProfiles.userId],
    references: [userProfiles.id],
  }),
}));

import { agencyThemeSettings, agencySectionsVisibility } from "./agencyPublishing";
import { agencyMedia } from "./agencyMedia";

export const agencyProfilesRelations = relations(agencyProfiles, ({ one, many }) => ({
  players: many(playerProfiles),
  invites: many(agencyInvites),
  themeSettings: one(agencyThemeSettings, {
    fields: [agencyProfiles.id],
    references: [agencyThemeSettings.agencyId],
  }),
  sectionsVisibility: many(agencySectionsVisibility),
  media: many(agencyMedia),
}));

export const agencyMediaRelations = relations(agencyMedia, ({ one }) => ({
  agency: one(agencyProfiles, {
    fields: [agencyMedia.agencyId],
    references: [agencyProfiles.id],
  }),
}));

export const agencyThemeSettingsRelations = relations(agencyThemeSettings, ({ one }) => ({
  agency: one(agencyProfiles, {
    fields: [agencyThemeSettings.agencyId],
    references: [agencyProfiles.id],
  }),
}));

export const agencySectionsVisibilityRelations = relations(agencySectionsVisibility, ({ one }) => ({
  agency: one(agencyProfiles, {
    fields: [agencySectionsVisibility.agencyId],
    references: [agencyProfiles.id],
  }),
}));

export const managerApplicationsRelations = relations(managerApplications, ({ one }) => ({
  user: one(userProfiles, {
    fields: [managerApplications.userId],
    references: [userProfiles.userId],
  }),
}));

// ==========================================
// AGENCY INVITES
// ==========================================
export const agencyInvitesRelations = relations(agencyInvites, ({ one }) => ({
  agency: one(agencyProfiles, {
    fields: [agencyInvites.agencyId],
    references: [agencyProfiles.id],
  }),
  invitedBy: one(userProfiles, {
    fields: [agencyInvites.invitedByUserId],
    references: [userProfiles.id],
  }),
}));

import { playerInvites } from "./playerInvites";
export const playerInvitesRelations = relations(playerInvites, ({ one }) => ({
  agency: one(agencyProfiles, {
    fields: [playerInvites.agencyId],
    references: [agencyProfiles.id],
  }),
  invitedBy: one(userProfiles, {
    fields: [playerInvites.invitedByUserId],
    references: [userProfiles.id],
  }),
}));

export const countriesRelations = relations(countries, ({ many }) => ({
  divisions: many(divisions),
}));

export const divisionsRelations = relations(divisions, ({ one, many }) => ({
  country: one(countries, {
    fields: [divisions.countryCode],
    references: [countries.code],
  }),
  teams: many(teams),
  careerItems: many(careerItems),
}));

export const teamsRelations = relations(teams, ({ one }) => ({
  division: one(divisions, {
    fields: [teams.divisionId],
    references: [divisions.id],
  }),
}));

export const careerItemsRelations = relations(careerItems, ({ one }) => ({
  division: one(divisions, {
    fields: [careerItems.divisionId],
    references: [divisions.id],
  }),
}));

// ==========================================
// COACHES VERTICAL
// ==========================================
import { coachProfiles } from "./coaches";
import { coachCareerItems } from "./coachCareer";
import {
  coachCareerRevisionRequests,
  coachCareerRevisionProposedTeams,
  coachCareerRevisionItems,
  coachStatsRevisionItems,
} from "./coachCareerRevisions";
import { coachStatsSeasons } from "./coachStats";
import { coachMedia, coachArticles } from "./coachMedia";
import {
  coachHonours,
  coachLinks,
  coachPersonalDetails,
} from "./coachPublishing";
import { coachLicenses } from "./coachLicenses";
import { coachChangeLogs } from "./coachLeads";

export const coachProfilesRelations = relations(coachProfiles, ({ one, many }) => ({
  currentTeam: one(teams, {
    fields: [coachProfiles.currentTeamId],
    references: [teams.id],
  }),
  agency: one(agencyProfiles, {
    fields: [coachProfiles.agencyId],
    references: [agencyProfiles.id],
  }),
  career: many(coachCareerItems),
  media: many(coachMedia),
  articles: many(coachArticles),
  honours: many(coachHonours),
  licenses: many(coachLicenses),
  seasons: many(coachStatsSeasons),
  links: many(coachLinks),
  changeLogs: many(coachChangeLogs),
  personalDetails: one(coachPersonalDetails, {
    fields: [coachProfiles.id],
    references: [coachPersonalDetails.coachId],
  }),
}));

export const coachCareerItemsRelations = relations(coachCareerItems, ({ one, many }) => ({
  coach: one(coachProfiles, {
    fields: [coachCareerItems.coachId],
    references: [coachProfiles.id],
  }),
  team: one(teams, {
    fields: [coachCareerItems.teamId],
    references: [teams.id],
  }),
  division: one(divisions, {
    fields: [coachCareerItems.divisionId],
    references: [divisions.id],
  }),
  honours: many(coachHonours),
  seasons: many(coachStatsSeasons),
}));

export const coachStatsSeasonsRelations = relations(coachStatsSeasons, ({ one }) => ({
  coach: one(coachProfiles, {
    fields: [coachStatsSeasons.coachId],
    references: [coachProfiles.id],
  }),
  careerItem: one(coachCareerItems, {
    fields: [coachStatsSeasons.careerItemId],
    references: [coachCareerItems.id],
  }),
}));

export const coachMediaRelations = relations(coachMedia, ({ one }) => ({
  coach: one(coachProfiles, {
    fields: [coachMedia.coachId],
    references: [coachProfiles.id],
  }),
}));

export const coachArticlesRelations = relations(coachArticles, ({ one }) => ({
  coach: one(coachProfiles, {
    fields: [coachArticles.coachId],
    references: [coachProfiles.id],
  }),
}));

export const coachHonoursRelations = relations(coachHonours, ({ one }) => ({
  coach: one(coachProfiles, {
    fields: [coachHonours.coachId],
    references: [coachProfiles.id],
  }),
  careerItem: one(coachCareerItems, {
    fields: [coachHonours.careerItemId],
    references: [coachCareerItems.id],
  }),
}));

export const coachLinksRelations = relations(coachLinks, ({ one }) => ({
  coach: one(coachProfiles, {
    fields: [coachLinks.coachId],
    references: [coachProfiles.id],
  }),
}));

export const coachLicensesRelations = relations(coachLicenses, ({ one }) => ({
  coach: one(coachProfiles, {
    fields: [coachLicenses.coachId],
    references: [coachProfiles.id],
  }),
}));

export const coachPersonalDetailsRelations = relations(coachPersonalDetails, ({ one }) => ({
  coach: one(coachProfiles, {
    fields: [coachPersonalDetails.coachId],
    references: [coachProfiles.id],
  }),
}));

export const coachChangeLogsRelations = relations(coachChangeLogs, ({ one }) => ({
  coach: one(coachProfiles, {
    fields: [coachChangeLogs.coachId],
    references: [coachProfiles.id],
  }),
}));

export const coachCareerRevisionRequestsRelations = relations(
  coachCareerRevisionRequests,
  ({ one, many }) => ({
    coach: one(coachProfiles, {
      fields: [coachCareerRevisionRequests.coachId],
      references: [coachProfiles.id],
    }),
    items: many(coachCareerRevisionItems),
    proposedTeams: many(coachCareerRevisionProposedTeams),
    statsItems: many(coachStatsRevisionItems),
  }),
);

export const coachCareerRevisionItemsRelations = relations(
  coachCareerRevisionItems,
  ({ one }) => ({
    request: one(coachCareerRevisionRequests, {
      fields: [coachCareerRevisionItems.requestId],
      references: [coachCareerRevisionRequests.id],
    }),
    proposedTeam: one(coachCareerRevisionProposedTeams, {
      fields: [coachCareerRevisionItems.proposedTeamId],
      references: [coachCareerRevisionProposedTeams.id],
    }),
  }),
);

export const coachCareerRevisionProposedTeamsRelations = relations(
  coachCareerRevisionProposedTeams,
  ({ one }) => ({
    request: one(coachCareerRevisionRequests, {
      fields: [coachCareerRevisionProposedTeams.requestId],
      references: [coachCareerRevisionRequests.id],
    }),
  }),
);

export const coachStatsRevisionItemsRelations = relations(
  coachStatsRevisionItems,
  ({ one }) => ({
    request: one(coachCareerRevisionRequests, {
      fields: [coachStatsRevisionItems.requestId],
      references: [coachCareerRevisionRequests.id],
    }),
  }),
);

// ==========================================
// NATIONAL TEAM (selección nacional)
// ==========================================
import { nationalTeamStints, nationalTeamMedia } from "./nationalTeams";

export const nationalTeamStintsRelations = relations(nationalTeamStints, ({ one }) => ({
  player: one(playerProfiles, {
    fields: [nationalTeamStints.playerId],
    references: [playerProfiles.id],
  }),
  team: one(teams, {
    fields: [nationalTeamStints.teamId],
    references: [teams.id],
  }),
}));

export const nationalTeamMediaRelations = relations(nationalTeamMedia, ({ one }) => ({
  player: one(playerProfiles, {
    fields: [nationalTeamMedia.playerId],
    references: [playerProfiles.id],
  }),
}));
