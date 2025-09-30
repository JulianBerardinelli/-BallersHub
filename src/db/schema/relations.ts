// Relations (opcionales)
import { relations } from "drizzle-orm";
import { playerProfiles } from "./players";
import { teams } from "./teams";
import { playerMedia } from "./media";
import { careerItems } from "./career";
import { statsSeasons } from "./stats";
import { reviewInvitations } from "./invitations";
import { reviews } from "./reviews";
import { reviewerProfiles } from "./reviewerProfiles";
import { reviewerPermissions } from "./reviewerPermissions";
import { playerPersonalDetails } from "./personalDetails";
import { profileChangeLogs } from "./profileChangeLogs";

export const playerProfilesRelations = relations(playerProfiles, ({ one, many }) => ({
  currentTeam: one(teams, {
    fields: [playerProfiles.currentTeamId],
    references: [teams.id],
  }),
  media: many(playerMedia),
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
