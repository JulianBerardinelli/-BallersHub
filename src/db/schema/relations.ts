// Relations (opcionales)
import { relations } from "drizzle-orm";
import { playerProfiles } from "./players";
import { playerMedia } from "./media";
import { careerItems } from "./career";
import { statsSeasons } from "./stats";
import { reviewInvitations } from "./invitations";
import { reviews } from "./reviews";
import { reviewerProfiles } from "./reviewerProfiles";
import { reviewerPermissions } from "./reviewerPermissions";

export const playerProfilesRelations = relations(playerProfiles, ({ many }) => ({
  media: many(playerMedia),
  career: many(careerItems),
  seasons: many(statsSeasons),
  invitations: many(reviewInvitations),
  reviews: many(reviews),
  reviewerPermissions: many(reviewerPermissions),
}));

export const reviewerProfilesRelations = relations(reviewerProfiles, ({ many }) => ({
  reviews: many(reviews),
  permissions: many(reviewerPermissions),
}));
