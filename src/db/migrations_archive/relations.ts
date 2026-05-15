import { relations } from "drizzle-orm/relations";
import { playerProfiles, profileSectionsVisibility, agencyProfiles, userProfiles, usersInAuth, teams, playerLinks, careerItems, reviewerProfiles, reviewerPermissions, subscriptions, reviews, playerArticles, playerHonours, playerApplications, reviewInvitations, careerItemProposals, playerMedia, statsRevisionItems, statsSeasons, careerRevisionRequests, agencyInvites, managerProfiles, profileChangeLogs, playerPersonalDetails, profileThemeSettings, careerRevisionItems, careerRevisionProposedTeams } from "./schema";

export const profileSectionsVisibilityRelations = relations(profileSectionsVisibility, ({one}) => ({
	playerProfile: one(playerProfiles, {
		fields: [profileSectionsVisibility.playerId],
		references: [playerProfiles.id]
	}),
}));

export const playerProfilesRelations = relations(playerProfiles, ({one, many}) => ({
	profileSectionsVisibilities: many(profileSectionsVisibility),
	agencyProfile: one(agencyProfiles, {
		fields: [playerProfiles.agencyId],
		references: [agencyProfiles.id]
	}),
	team: one(teams, {
		fields: [playerProfiles.currentTeamId],
		references: [teams.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [playerProfiles.userId],
		references: [usersInAuth.id]
	}),
	playerLinks: many(playerLinks),
	careerItems: many(careerItems),
	reviewerPermissions: many(reviewerPermissions),
	reviews: many(reviews),
	playerArticles: many(playerArticles),
	playerHonours: many(playerHonours),
	reviewInvitations: many(reviewInvitations),
	playerMedias: many(playerMedia),
	profileChangeLogs: many(profileChangeLogs),
	playerPersonalDetails: many(playerPersonalDetails),
	profileThemeSettings: many(profileThemeSettings),
	careerRevisionRequests: many(careerRevisionRequests),
	statsSeasons: many(statsSeasons),
}));

export const userProfilesRelations = relations(userProfiles, ({one, many}) => ({
	agencyProfile: one(agencyProfiles, {
		fields: [userProfiles.agencyId],
		references: [agencyProfiles.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [userProfiles.userId],
		references: [usersInAuth.id]
	}),
	agencyInvites: many(agencyInvites),
	managerProfiles: many(managerProfiles),
}));

export const agencyProfilesRelations = relations(agencyProfiles, ({many}) => ({
	userProfiles: many(userProfiles),
	playerProfiles: many(playerProfiles),
	agencyInvites: many(agencyInvites),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	userProfiles: many(userProfiles),
	playerProfiles: many(playerProfiles),
	reviewerProfiles: many(reviewerProfiles),
	reviewerPermissions: many(reviewerPermissions),
	subscriptions: many(subscriptions),
	reviews: many(reviews),
	playerApplications_reviewedByUserId: many(playerApplications, {
		relationName: "playerApplications_reviewedByUserId_usersInAuth_id"
	}),
	playerApplications_userId: many(playerApplications, {
		relationName: "playerApplications_userId_usersInAuth_id"
	}),
	careerItemProposals_createdByUserId: many(careerItemProposals, {
		relationName: "careerItemProposals_createdByUserId_usersInAuth_id"
	}),
	careerItemProposals_reviewedByUserId: many(careerItemProposals, {
		relationName: "careerItemProposals_reviewedByUserId_usersInAuth_id"
	}),
	profileChangeLogs: many(profileChangeLogs),
	careerRevisionRequests_reviewedByUserId: many(careerRevisionRequests, {
		relationName: "careerRevisionRequests_reviewedByUserId_usersInAuth_id"
	}),
	careerRevisionRequests_submittedByUserId: many(careerRevisionRequests, {
		relationName: "careerRevisionRequests_submittedByUserId_usersInAuth_id"
	}),
}));

export const teamsRelations = relations(teams, ({one, many}) => ({
	playerProfiles: many(playerProfiles),
	careerItems: many(careerItems),
	playerApplications: many(playerApplications, {
		relationName: "playerApplications_currentTeamId_teams_id"
	}),
	careerItemProposal: one(careerItemProposals, {
		fields: [teams.requestedFromCareerItemId],
		references: [careerItemProposals.id],
		relationName: "teams_requestedFromCareerItemId_careerItemProposals_id"
	}),
	playerApplication: one(playerApplications, {
		fields: [teams.requestedInApplicationId],
		references: [playerApplications.id],
		relationName: "teams_requestedInApplicationId_playerApplications_id"
	}),
	careerItemProposals: many(careerItemProposals, {
		relationName: "careerItemProposals_teamId_teams_id"
	}),
	careerRevisionItems: many(careerRevisionItems),
}));

export const playerLinksRelations = relations(playerLinks, ({one}) => ({
	playerProfile: one(playerProfiles, {
		fields: [playerLinks.playerId],
		references: [playerProfiles.id]
	}),
}));

export const careerItemsRelations = relations(careerItems, ({one, many}) => ({
	playerProfile: one(playerProfiles, {
		fields: [careerItems.playerId],
		references: [playerProfiles.id]
	}),
	team: one(teams, {
		fields: [careerItems.teamId],
		references: [teams.id]
	}),
	playerHonours: many(playerHonours),
	statsRevisionItems: many(statsRevisionItems),
	careerRevisionItems: many(careerRevisionItems),
	statsSeasons: many(statsSeasons),
}));

export const reviewerProfilesRelations = relations(reviewerProfiles, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [reviewerProfiles.userId],
		references: [usersInAuth.id]
	}),
	reviewerPermissions: many(reviewerPermissions),
	reviews: many(reviews),
}));

export const reviewerPermissionsRelations = relations(reviewerPermissions, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [reviewerPermissions.grantedByUserId],
		references: [usersInAuth.id]
	}),
	playerProfile: one(playerProfiles, {
		fields: [reviewerPermissions.playerId],
		references: [playerProfiles.id]
	}),
	reviewerProfile: one(reviewerProfiles, {
		fields: [reviewerPermissions.reviewerId],
		references: [reviewerProfiles.id]
	}),
}));

export const subscriptionsRelations = relations(subscriptions, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [subscriptions.userId],
		references: [usersInAuth.id]
	}),
}));

export const reviewsRelations = relations(reviews, ({one}) => ({
	reviewerProfile: one(reviewerProfiles, {
		fields: [reviews.authorReviewerId],
		references: [reviewerProfiles.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [reviews.authorUserId],
		references: [usersInAuth.id]
	}),
	playerProfile: one(playerProfiles, {
		fields: [reviews.playerId],
		references: [playerProfiles.id]
	}),
}));

export const playerArticlesRelations = relations(playerArticles, ({one}) => ({
	playerProfile: one(playerProfiles, {
		fields: [playerArticles.playerId],
		references: [playerProfiles.id]
	}),
}));

export const playerHonoursRelations = relations(playerHonours, ({one}) => ({
	careerItem: one(careerItems, {
		fields: [playerHonours.careerItemId],
		references: [careerItems.id]
	}),
	playerProfile: one(playerProfiles, {
		fields: [playerHonours.playerId],
		references: [playerProfiles.id]
	}),
}));

export const playerApplicationsRelations = relations(playerApplications, ({one, many}) => ({
	team: one(teams, {
		fields: [playerApplications.currentTeamId],
		references: [teams.id],
		relationName: "playerApplications_currentTeamId_teams_id"
	}),
	usersInAuth_reviewedByUserId: one(usersInAuth, {
		fields: [playerApplications.reviewedByUserId],
		references: [usersInAuth.id],
		relationName: "playerApplications_reviewedByUserId_usersInAuth_id"
	}),
	usersInAuth_userId: one(usersInAuth, {
		fields: [playerApplications.userId],
		references: [usersInAuth.id],
		relationName: "playerApplications_userId_usersInAuth_id"
	}),
	teams: many(teams, {
		relationName: "teams_requestedInApplicationId_playerApplications_id"
	}),
	careerItemProposals: many(careerItemProposals),
}));

export const reviewInvitationsRelations = relations(reviewInvitations, ({one}) => ({
	playerProfile: one(playerProfiles, {
		fields: [reviewInvitations.playerId],
		references: [playerProfiles.id]
	}),
}));

export const careerItemProposalsRelations = relations(careerItemProposals, ({one, many}) => ({
	teams: many(teams, {
		relationName: "teams_requestedFromCareerItemId_careerItemProposals_id"
	}),
	playerApplication: one(playerApplications, {
		fields: [careerItemProposals.applicationId],
		references: [playerApplications.id]
	}),
	usersInAuth_createdByUserId: one(usersInAuth, {
		fields: [careerItemProposals.createdByUserId],
		references: [usersInAuth.id],
		relationName: "careerItemProposals_createdByUserId_usersInAuth_id"
	}),
	usersInAuth_reviewedByUserId: one(usersInAuth, {
		fields: [careerItemProposals.reviewedByUserId],
		references: [usersInAuth.id],
		relationName: "careerItemProposals_reviewedByUserId_usersInAuth_id"
	}),
	team: one(teams, {
		fields: [careerItemProposals.teamId],
		references: [teams.id],
		relationName: "careerItemProposals_teamId_teams_id"
	}),
}));

export const playerMediaRelations = relations(playerMedia, ({one}) => ({
	playerProfile: one(playerProfiles, {
		fields: [playerMedia.playerId],
		references: [playerProfiles.id]
	}),
}));

export const statsRevisionItemsRelations = relations(statsRevisionItems, ({one}) => ({
	careerItem: one(careerItems, {
		fields: [statsRevisionItems.careerItemId],
		references: [careerItems.id]
	}),
	statsSeason: one(statsSeasons, {
		fields: [statsRevisionItems.originalStatId],
		references: [statsSeasons.id]
	}),
	careerRevisionRequest: one(careerRevisionRequests, {
		fields: [statsRevisionItems.requestId],
		references: [careerRevisionRequests.id]
	}),
}));

export const statsSeasonsRelations = relations(statsSeasons, ({one, many}) => ({
	statsRevisionItems: many(statsRevisionItems),
	careerItem: one(careerItems, {
		fields: [statsSeasons.careerItemId],
		references: [careerItems.id]
	}),
	playerProfile: one(playerProfiles, {
		fields: [statsSeasons.playerId],
		references: [playerProfiles.id]
	}),
}));

export const careerRevisionRequestsRelations = relations(careerRevisionRequests, ({one, many}) => ({
	statsRevisionItems: many(statsRevisionItems),
	playerProfile: one(playerProfiles, {
		fields: [careerRevisionRequests.playerId],
		references: [playerProfiles.id]
	}),
	usersInAuth_reviewedByUserId: one(usersInAuth, {
		fields: [careerRevisionRequests.reviewedByUserId],
		references: [usersInAuth.id],
		relationName: "careerRevisionRequests_reviewedByUserId_usersInAuth_id"
	}),
	usersInAuth_submittedByUserId: one(usersInAuth, {
		fields: [careerRevisionRequests.submittedByUserId],
		references: [usersInAuth.id],
		relationName: "careerRevisionRequests_submittedByUserId_usersInAuth_id"
	}),
	careerRevisionItems: many(careerRevisionItems),
	careerRevisionProposedTeams: many(careerRevisionProposedTeams),
}));

export const agencyInvitesRelations = relations(agencyInvites, ({one}) => ({
	agencyProfile: one(agencyProfiles, {
		fields: [agencyInvites.agencyId],
		references: [agencyProfiles.id]
	}),
	userProfile: one(userProfiles, {
		fields: [agencyInvites.invitedByUserId],
		references: [userProfiles.id]
	}),
}));

export const managerProfilesRelations = relations(managerProfiles, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [managerProfiles.userId],
		references: [userProfiles.id]
	}),
}));

export const profileChangeLogsRelations = relations(profileChangeLogs, ({one}) => ({
	playerProfile: one(playerProfiles, {
		fields: [profileChangeLogs.playerId],
		references: [playerProfiles.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [profileChangeLogs.userId],
		references: [usersInAuth.id]
	}),
}));

export const playerPersonalDetailsRelations = relations(playerPersonalDetails, ({one}) => ({
	playerProfile: one(playerProfiles, {
		fields: [playerPersonalDetails.playerId],
		references: [playerProfiles.id]
	}),
}));

export const profileThemeSettingsRelations = relations(profileThemeSettings, ({one}) => ({
	playerProfile: one(playerProfiles, {
		fields: [profileThemeSettings.playerId],
		references: [playerProfiles.id]
	}),
}));

export const careerRevisionItemsRelations = relations(careerRevisionItems, ({one}) => ({
	careerItem: one(careerItems, {
		fields: [careerRevisionItems.originalItemId],
		references: [careerItems.id]
	}),
	careerRevisionProposedTeam: one(careerRevisionProposedTeams, {
		fields: [careerRevisionItems.proposedTeamId],
		references: [careerRevisionProposedTeams.id]
	}),
	careerRevisionRequest: one(careerRevisionRequests, {
		fields: [careerRevisionItems.requestId],
		references: [careerRevisionRequests.id]
	}),
	team: one(teams, {
		fields: [careerRevisionItems.teamId],
		references: [teams.id]
	}),
}));

export const careerRevisionProposedTeamsRelations = relations(careerRevisionProposedTeams, ({one, many}) => ({
	careerRevisionItems: many(careerRevisionItems),
	careerRevisionRequest: one(careerRevisionRequests, {
		fields: [careerRevisionProposedTeams.requestId],
		references: [careerRevisionRequests.id]
	}),
}));