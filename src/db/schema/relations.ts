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

export const agencyProfilesRelations = relations(agencyProfiles, ({ many }) => ({
  players: many(playerProfiles),
  invites: many(agencyInvites),
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
