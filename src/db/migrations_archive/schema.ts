import { pgTable, foreignKey, unique, pgPolicy, uuid, text, boolean, jsonb, timestamp, index, date, integer, numeric, char, uniqueIndex, inet, type AnyPgColumn, check, pgView, varchar, bigint, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const inviteStatus = pgEnum("invite_status", ['sent', 'accepted', 'expired', 'revoked'])
export const mediaType = pgEnum("media_type", ['photo', 'video', 'doc'])
export const plan = pgEnum("plan", ['free', 'pro', 'pro_plus'])
export const playerStatus = pgEnum("player_status", ['draft', 'pending_review', 'approved', 'rejected'])
export const reviewStatus = pgEnum("review_status", ['pending', 'approved', 'rejected'])
export const reviewerPermStatus = pgEnum("reviewer_perm_status", ['pending', 'granted', 'revoked'])
export const role = pgEnum("role", ['member', 'player', 'coach', 'manager', 'reviewer', 'admin', 'moderator', 'analyst'])
export const teamKind = pgEnum("team_kind", ['club', 'national', 'academy', 'amateur'])
export const teamStatus = pgEnum("team_status", ['pending', 'approved', 'rejected'])
export const visibility = pgEnum("visibility", ['public', 'private'])


export const profileSectionsVisibility = pgTable("profile_sections_visibility", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id").notNull(),
	section: text().notNull(),
	visible: boolean().default(true).notNull(),
	settings: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [playerProfiles.id],
			name: "profile_sections_visibility_player_id_fkey"
		}).onDelete("cascade"),
	unique("profile_sections_visibility_player_section_key").on(table.playerId, table.section),
	pgPolicy("profile_sections_visibility_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM player_profiles p
  WHERE ((p.id = profile_sections_visibility.player_id) AND ((p.user_id = auth.uid()) OR is_admin(auth.uid())))))` }),
	pgPolicy("profile_sections_visibility_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("profile_sections_visibility_select", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("profile_sections_visibility_update", { as: "permissive", for: "update", to: ["public"] }),
]);

export const userProfiles = pgTable("user_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	role: role().default('member').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	agencyId: uuid("agency_id"),
}, (table) => [
	foreignKey({
			columns: [table.agencyId],
			foreignColumns: [agencyProfiles.id],
			name: "user_profiles_agency_id_agency_profiles_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_profiles_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_profiles_user_id_key").on(table.userId),
	pgPolicy("user_profiles_select", { as: "permissive", for: "select", to: ["public"], using: sql`((user_id = auth.uid()) OR is_admin(auth.uid()))` }),
	pgPolicy("user_profiles_update", { as: "permissive", for: "update", to: ["public"] }),
]);

export const playerProfiles = pgTable("player_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	slug: text().notNull(),
	fullName: text("full_name").notNull(),
	birthDate: date("birth_date"),
	nationality: text().array(),
	foot: text(),
	heightCm: integer("height_cm"),
	weightKg: integer("weight_kg"),
	positions: text().array(),
	currentClub: text("current_club"),
	bio: text(),
	visibility: visibility().default('public').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	avatarUrl: text("avatar_url").default('/images/player-default.jpg').notNull(),
	status: playerStatus().default('draft').notNull(),
	marketValueEur: numeric("market_value_eur", { precision: 12, scale:  2 }),
	planPublic: plan("plan_public").default('free').notNull(),
	currentTeamId: uuid("current_team_id"),
	nationalityCodes: char("nationality_codes", { length: 2 }).array(),
	contractStatus: text("contract_status"),
	careerObjectives: text("career_objectives"),
	transfermarktUrl: text("transfermarkt_url"),
	agencyId: uuid("agency_id"),
}, (table) => [
	index("idx_player_profiles_current_team_id").using("btree", table.currentTeamId.asc().nullsLast().op("uuid_ops")),
	index("idx_player_profiles_nationality_codes").using("gin", table.nationalityCodes.asc().nullsLast().op("array_ops")),
	index("idx_player_profiles_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_player_slug").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.agencyId],
			foreignColumns: [agencyProfiles.id],
			name: "player_profiles_agency_id_agency_profiles_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.currentTeamId],
			foreignColumns: [teams.id],
			name: "player_profiles_current_team_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "player_profiles_user_id_fkey"
		}).onDelete("cascade"),
	unique("player_profiles_slug_key").on(table.slug),
	pgPolicy("player_profiles_cud", { as: "permissive", for: "all", to: ["public"], using: sql`((user_id = auth.uid()) OR is_admin(auth.uid()))`, withCheck: sql`((user_id = auth.uid()) OR is_admin(auth.uid()))`  }),
	pgPolicy("player_profiles_read", { as: "permissive", for: "select", to: ["public"] }),
]);

export const playerLinks = pgTable("player_links", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id").notNull(),
	label: text(),
	url: text().notNull(),
	kind: text().notNull(),
	isPrimary: boolean("is_primary").default(false).notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_player_links_kind").using("btree", table.kind.asc().nullsLast().op("text_ops")),
	index("idx_player_links_player").using("btree", table.playerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [playerProfiles.id],
			name: "player_links_player_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("player_links_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM player_profiles p
  WHERE ((p.id = player_links.player_id) AND ((p.user_id = auth.uid()) OR is_admin(auth.uid())))))` }),
	pgPolicy("player_links_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("player_links_select", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("player_links_update", { as: "permissive", for: "update", to: ["public"] }),
]);

export const careerItems = pgTable("career_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id").notNull(),
	club: text().notNull(),
	division: text(),
	startDate: date("start_date"),
	endDate: date("end_date"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	teamId: uuid("team_id"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_career_player").using("btree", table.playerId.asc().nullsLast().op("uuid_ops")),
	index("idx_career_team").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [playerProfiles.id],
			name: "career_items_player_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "career_items_team_id_fkey"
		}).onDelete("set null"),
	pgPolicy("career_cud", { as: "permissive", for: "all", to: ["public"], using: sql`((EXISTS ( SELECT 1
   FROM player_profiles p
  WHERE ((p.id = career_items.player_id) AND (p.user_id = auth.uid())))) OR is_admin(auth.uid()))`, withCheck: sql`((EXISTS ( SELECT 1
   FROM player_profiles p
  WHERE ((p.id = career_items.player_id) AND (p.user_id = auth.uid())))) OR is_admin(auth.uid()))`  }),
	pgPolicy("career_select", { as: "permissive", for: "select", to: ["public"] }),
]);

export const reviewerProfiles = pgTable("reviewer_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	slug: text(),
	fullName: text("full_name"),
	roleLabel: text("role_label"),
	club: text(),
	bio: text(),
	contactEmail: text("contact_email"),
	contactPhoneEnc: text("contact_phone_enc"),
	visibility: visibility().default('private').notNull(),
	verified: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_reviewer_profiles_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "reviewer_profiles_user_id_fkey"
		}).onDelete("set null"),
	unique("reviewer_profiles_slug_key").on(table.slug),
	pgPolicy("reviewer_profiles_insert", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`is_admin(auth.uid())`  }),
	pgPolicy("reviewer_profiles_select", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("reviewer_profiles_update", { as: "permissive", for: "update", to: ["public"] }),
]);

export const reviewerPermissions = pgTable("reviewer_permissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id").notNull(),
	reviewerId: uuid("reviewer_id").notNull(),
	grantedByUserId: uuid("granted_by_user_id").notNull(),
	status: reviewerPermStatus().default('granted').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("uniq_reviewer_permission").using("btree", table.playerId.asc().nullsLast().op("uuid_ops"), table.reviewerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.grantedByUserId],
			foreignColumns: [users.id],
			name: "reviewer_permissions_granted_by_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [playerProfiles.id],
			name: "reviewer_permissions_player_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.reviewerId],
			foreignColumns: [reviewerProfiles.id],
			name: "reviewer_permissions_reviewer_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("reviewer_permissions_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`is_admin(auth.uid())` }),
	pgPolicy("reviewer_permissions_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("reviewer_permissions_select", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("reviewer_permissions_update", { as: "permissive", for: "update", to: ["public"] }),
]);

export const subscriptions = pgTable("subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	plan: plan().default('free').notNull(),
	status: text().default('active').notNull(),
	limitsJson: jsonb("limits_json").default({}).notNull(),
	currentPeriodEnd: timestamp("current_period_end", { withTimezone: true, mode: 'string' }),
	canceledAt: timestamp("canceled_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "subscriptions_user_id_fkey"
		}).onDelete("cascade"),
	unique("subscriptions_user_id_key").on(table.userId),
	pgPolicy("subs_delete_admin", { as: "permissive", for: "delete", to: ["public"], using: sql`is_admin(auth.uid())` }),
	pgPolicy("subs_insert_admin", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("subs_insert_owner", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("subs_select", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("subs_update", { as: "permissive", for: "update", to: ["public"] }),
]);

export const reviews = pgTable("reviews", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id").notNull(),
	authorUserId: uuid("author_user_id"),
	authorReviewerId: uuid("author_reviewer_id"),
	authorName: text("author_name"),
	authorEmailHash: text("author_email_hash"),
	content: text().notNull(),
	rating: integer(),
	status: reviewStatus().default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_reviews_author_reviewer").using("btree", table.authorReviewerId.asc().nullsLast().op("uuid_ops")),
	index("idx_reviews_player_status").using("btree", table.playerId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.authorReviewerId],
			foreignColumns: [reviewerProfiles.id],
			name: "reviews_author_reviewer_id_fkey"
		}),
	foreignKey({
			columns: [table.authorUserId],
			foreignColumns: [users.id],
			name: "reviews_author_user_id_fkey"
		}),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [playerProfiles.id],
			name: "reviews_player_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("reviews_insert_reviewer", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(plan_allows_reviews(player_id) AND (EXISTS ( SELECT 1
   FROM (reviewer_profiles r
     JOIN reviewer_permissions rp ON ((rp.reviewer_id = r.id)))
  WHERE ((r.user_id = auth.uid()) AND (rp.player_id = reviews.player_id) AND (rp.status = 'granted'::reviewer_perm_status)))))`  }),
	pgPolicy("reviews_public_read", { as: "permissive", for: "select", to: ["public"] }),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	actorIp: inet("actor_ip"),
	action: text().notNull(),
	subjectTable: text("subject_table"),
	subjectId: uuid("subject_id"),
	meta: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("audit_select", { as: "permissive", for: "select", to: ["public"], using: sql`is_admin(auth.uid())` }),
]);

export const playerArticles = pgTable("player_articles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id").notNull(),
	title: text().notNull(),
	url: text().notNull(),
	publisher: text(),
	publishedAt: date("published_at"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [playerProfiles.id],
			name: "player_articles_player_id_player_profiles_id_fk"
		}).onDelete("cascade"),
]);

export const playerHonours = pgTable("player_honours", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id").notNull(),
	title: text().notNull(),
	competition: text(),
	season: text(),
	awardedOn: date("awarded_on"),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	careerItemId: uuid("career_item_id"),
}, (table) => [
	index("idx_player_honours_career_item").using("btree", table.careerItemId.asc().nullsLast().op("uuid_ops")),
	index("idx_player_honours_player").using("btree", table.playerId.asc().nullsLast().op("uuid_ops")),
	index("idx_player_honours_season").using("btree", table.season.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.careerItemId],
			foreignColumns: [careerItems.id],
			name: "player_honours_career_item_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [playerProfiles.id],
			name: "player_honours_player_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("player_honours_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM player_profiles p
  WHERE ((p.id = player_honours.player_id) AND ((p.user_id = auth.uid()) OR is_admin(auth.uid())))))` }),
	pgPolicy("player_honours_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("player_honours_select", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("player_honours_update", { as: "permissive", for: "update", to: ["public"] }),
]);

export const playerApplications = pgTable("player_applications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	planRequested: plan("plan_requested").default('free').notNull(),
	fullName: text("full_name"),
	nationality: text().array(),
	positions: text().array(),
	currentClub: text("current_club"),
	transfermarktUrl: text("transfermarkt_url"),
	externalProfileUrl: text("external_profile_url"),
	idDocUrl: text("id_doc_url"),
	selfieUrl: text("selfie_url"),
	notes: text(),
	status: text().default('pending').notNull(),
	reviewedByUserId: uuid("reviewed_by_user_id"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	currentTeamId: uuid("current_team_id"),
	proposedTeamName: text("proposed_team_name"),
	proposedTeamCountry: text("proposed_team_country"),
	freeAgent: boolean("free_agent").default(false).notNull(),
	proposedTeamCategory: text("proposed_team_category"),
	proposedTeamTransfermarktUrl: text("proposed_team_transfermarkt_url"),
	proposedTeamCountryCode: char("proposed_team_country_code", { length: 2 }),
	personalInfoApproved: boolean("personal_info_approved").default(false).notNull(),
}, (table) => [
	index("idx_app_proposed_team_country_code").using("btree", table.proposedTeamCountryCode.asc().nullsLast().op("bpchar_ops")),
	uniqueIndex("uniq_pending_application_per_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")).where(sql`(status = 'pending'::text)`),
	foreignKey({
			columns: [table.currentTeamId],
			foreignColumns: [teams.id],
			name: "player_applications_current_team_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.reviewedByUserId],
			foreignColumns: [users.id],
			name: "player_applications_reviewed_by_user_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "player_applications_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("pa_admin_all", { as: "permissive", for: "all", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::role))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::role))))`  }),
	pgPolicy("pa_owner_insert_pending", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("pa_owner_select", { as: "permissive", for: "select", to: ["public"] }),
]);

export const reviewInvitations = pgTable("review_invitations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id").notNull(),
	inviteeEmailHash: text("invitee_email_hash").notNull(),
	inviteeName: text("invitee_name"),
	roleLabel: text("role_label"),
	tokenHash: text("token_hash").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	status: inviteStatus().default('sent').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_inv_player").using("btree", table.playerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [playerProfiles.id],
			name: "review_invitations_player_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("inv_insert", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`((EXISTS ( SELECT 1
   FROM player_profiles p
  WHERE ((p.id = review_invitations.player_id) AND (p.user_id = auth.uid())))) AND can_create_invitation(player_id))`  }),
	pgPolicy("inv_select", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("inv_update", { as: "permissive", for: "update", to: ["public"] }),
]);

export const teams = pgTable("teams", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	country: text(),
	kind: teamKind().default('club').notNull(),
	visibility: visibility().default('public').notNull(),
	status: teamStatus().default('pending').notNull(),
	altNames: text("alt_names").array(),
	tags: text().array(),
	crestUrl: text("crest_url").default('/images/team-default.svg').notNull(),
	requestedByUserId: uuid("requested_by_user_id"),
	requestedInApplicationId: uuid("requested_in_application_id"),
	featured: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	category: text(),
	transfermarktUrl: text("transfermarkt_url"),
	countryCode: char("country_code", { length: 2 }),
	requestedFromCareerItemId: uuid("requested_from_career_item_id"),
}, (table) => [
	index("idx_teams_country_code").using("btree", table.countryCode.asc().nullsLast().op("bpchar_ops")),
	index("idx_teams_lower_name").using("btree", sql`lower(name)`),
	index("idx_teams_req_from_cip").using("btree", table.requestedFromCareerItemId.asc().nullsLast().op("uuid_ops")),
	index("idx_teams_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	uniqueIndex("teams_name_country_key").using("btree", sql`lower(name)`, sql`COALESCE(country, ''::text)`),
	foreignKey({
			columns: [table.requestedFromCareerItemId],
			foreignColumns: [careerItemProposals.id],
			name: "teams_requested_from_career_item_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.requestedInApplicationId],
			foreignColumns: [playerApplications.id],
			name: "teams_requested_in_application_id_fkey"
		}).onDelete("set null"),
	unique("teams_slug_key").on(table.slug),
	pgPolicy("teams_admin_read", { as: "permissive", for: "select", to: ["authenticated"], using: sql`is_admin(auth.uid())` }),
	pgPolicy("teams_admin_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("teams_del_none", { as: "permissive", for: "delete", to: ["authenticated"] }),
	pgPolicy("teams_insert_none", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("teams_public_read", { as: "permissive", for: "select", to: ["anon", "authenticated"] }),
	pgPolicy("teams_ud_none", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const playerMedia = pgTable("player_media", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id").notNull(),
	type: mediaType().notNull(),
	url: text().notNull(),
	title: text(),
	provider: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	isPrimary: boolean("is_primary").default(false).notNull(),
	isApproved: boolean("is_approved").default(true).notNull(),
	isFlagged: boolean("is_flagged").default(false).notNull(),
	reviewedBy: uuid("reviewed_by"),
	altText: text("alt_text"),
	tags: text().array(),
}, (table) => [
	index("idx_player_media_player").using("btree", table.playerId.asc().nullsLast().op("uuid_ops")),
	index("idx_player_media_primary_photo").using("btree", table.playerId.asc().nullsLast().op("uuid_ops")).where(sql`is_primary`),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [playerProfiles.id],
			name: "player_media_player_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("player_media_owner_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`((EXISTS ( SELECT 1
   FROM player_profiles p
  WHERE ((p.id = player_media.player_id) AND (p.user_id = auth.uid())))) OR is_admin(auth.uid()))` }),
	pgPolicy("player_media_owner_insert_limit", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("player_media_owner_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("player_media_select", { as: "permissive", for: "select", to: ["public"] }),
]);

export const statsRevisionItems = pgTable("stats_revision_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	requestId: uuid("request_id").notNull(),
	originalStatId: uuid("original_stat_id"),
	season: text().notNull(),
	matches: integer().default(0),
	goals: integer().default(0),
	assists: integer().default(0),
	minutes: integer().default(0),
	yellowCards: integer("yellow_cards").default(0),
	redCards: integer("red_cards").default(0),
	competition: text(),
	team: text(),
	careerItemId: uuid("career_item_id"),
	orderIndex: integer("order_index").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	starts: integer().default(0),
}, (table) => [
	foreignKey({
			columns: [table.careerItemId],
			foreignColumns: [careerItems.id],
			name: "stats_revision_items_career_item_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.originalStatId],
			foreignColumns: [statsSeasons.id],
			name: "stats_revision_items_original_stat_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.requestId],
			foreignColumns: [careerRevisionRequests.id],
			name: "stats_revision_items_request_id_career_revision_requests_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Enable delete for admin/users", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`true` }),
	pgPolicy("Enable insert for authenticated users", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("Enable read for authenticated users", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Enable update for admin/users", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const careerItemProposals = pgTable("career_item_proposals", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	applicationId: uuid("application_id").notNull(),
	club: text().notNull(),
	division: text(),
	startYear: integer("start_year"),
	endYear: integer("end_year"),
	teamId: uuid("team_id"),
	proposedTeamName: text("proposed_team_name"),
	proposedTeamCountry: text("proposed_team_country"),
	proposedTeamCountryCode: text("proposed_team_country_code"),
	proposedTeamTransfermarktUrl: text("proposed_team_transfermarkt_url"),
	status: text().default('pending').notNull(),
	reviewedByUserId: uuid("reviewed_by_user_id"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	materializedAt: timestamp("materialized_at", { withTimezone: true, mode: 'string' }),
	createdByUserId: uuid("created_by_user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_cip_app").using("btree", table.applicationId.asc().nullsLast().op("uuid_ops")),
	index("idx_cip_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_cip_team").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.applicationId],
			foreignColumns: [playerApplications.id],
			name: "career_item_proposals_application_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [users.id],
			name: "career_item_proposals_created_by_user_id_fkey"
		}),
	foreignKey({
			columns: [table.reviewedByUserId],
			foreignColumns: [users.id],
			name: "career_item_proposals_reviewed_by_user_id_fkey"
		}),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "career_item_proposals_team_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("cip_admin_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::role))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::role))))`  }),
	pgPolicy("cip_owner_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("cip_owner_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const agencyInvites = pgTable("agency_invites", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	agencyId: uuid("agency_id").notNull(),
	email: text().notNull(),
	invitedByUserId: uuid("invited_by_user_id").notNull(),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.agencyId],
			foreignColumns: [agencyProfiles.id],
			name: "agency_invites_agency_id_agency_profiles_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.invitedByUserId],
			foreignColumns: [userProfiles.id],
			name: "agency_invites_invited_by_user_id_user_profiles_id_fk"
		}).onDelete("cascade"),
]);

export const countries = pgTable("countries", {
	code: char({ length: 2 }).primaryKey().notNull(),
	nameEn: text("name_en").notNull(),
	nameEs: text("name_es"),
});

export const managerProfiles = pgTable("manager_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	fullName: text("full_name").notNull(),
	avatarUrl: text("avatar_url"),
	bio: text(),
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfiles.id],
			name: "manager_profiles_user_id_user_profiles_id_fk"
		}).onDelete("cascade"),
]);

export const profileChangeLogs = pgTable("profile_change_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id").notNull(),
	userId: uuid("user_id"),
	field: text().notNull(),
	oldValue: jsonb("old_value"),
	newValue: jsonb("new_value"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_profile_change_logs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_profile_change_logs_player").using("btree", table.playerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [playerProfiles.id],
			name: "profile_change_logs_player_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "profile_change_logs_user_id_fkey"
		}).onDelete("set null"),
	pgPolicy("profile_change_logs_insert", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(EXISTS ( SELECT 1
   FROM player_profiles p
  WHERE ((p.id = profile_change_logs.player_id) AND ((p.user_id = auth.uid()) OR is_admin(auth.uid())))))`  }),
	pgPolicy("profile_change_logs_select", { as: "permissive", for: "select", to: ["public"] }),
]);

export const playerPersonalDetails = pgTable("player_personal_details", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id").notNull(),
	documentType: text("document_type"),
	documentNumber: text("document_number"),
	documentCountry: text("document_country"),
	documentCountryCode: char("document_country_code", { length: 2 }),
	languages: text().array(),
	phone: text(),
	residenceCity: text("residence_city"),
	residenceCountry: text("residence_country"),
	residenceCountryCode: char("residence_country_code", { length: 2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_player_personal_details_player").using("btree", table.playerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [playerProfiles.id],
			name: "player_personal_details_player_id_fkey"
		}).onDelete("cascade"),
	unique("player_personal_details_player_id_key").on(table.playerId),
	pgPolicy("player_personal_details_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM player_profiles p
  WHERE ((p.id = player_personal_details.player_id) AND ((p.user_id = auth.uid()) OR is_admin(auth.uid())))))` }),
	pgPolicy("player_personal_details_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("player_personal_details_select", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("player_personal_details_update", { as: "permissive", for: "update", to: ["public"] }),
]);

export const agencyProfiles = pgTable("agency_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	logoUrl: text("logo_url"),
	description: text(),
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),
	websiteUrl: text("website_url"),
	isApproved: boolean("is_approved").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	verifiedLink: text("verified_link"),
	agentLicenseUrl: text("agent_license_url"),
	agentLicenseType: text("agent_license_type"),
	licenses: jsonb(),
	operativeCountries: text("operative_countries").array(),
	headquarters: text(),
	foundationYear: integer("foundation_year"),
	instagramUrl: text("instagram_url"),
	twitterUrl: text("twitter_url"),
	linkedinUrl: text("linkedin_url"),
	services: text().array(),
}, (table) => [
	unique("agency_profiles_slug_unique").on(table.slug),
]);

export const profileThemeSettings = pgTable("profile_theme_settings", {
	playerId: uuid("player_id").primaryKey().notNull(),
	layout: text().default('classic').notNull(),
	primaryColor: text("primary_color"),
	accentColor: text("accent_color"),
	typography: text(),
	coverMode: text("cover_mode").default('photo'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [playerProfiles.id],
			name: "profile_theme_settings_player_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("profile_theme_settings_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM player_profiles p
  WHERE ((p.id = profile_theme_settings.player_id) AND ((p.user_id = auth.uid()) OR is_admin(auth.uid())))))` }),
	pgPolicy("profile_theme_settings_select", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("profile_theme_settings_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("profile_theme_settings_upsert", { as: "permissive", for: "insert", to: ["public"] }),
]);

export const careerRevisionRequests = pgTable("career_revision_requests", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	playerId: uuid("player_id").notNull(),
	status: text().default('pending').notNull(),
	submittedByUserId: uuid("submitted_by_user_id").notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	reviewedByUserId: uuid("reviewed_by_user_id"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	resolutionNote: text("resolution_note"),
	changeSummary: text("change_summary"),
	currentSnapshot: jsonb("current_snapshot").default([]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_career_revision_player").using("btree", table.playerId.asc().nullsLast().op("uuid_ops")),
	index("idx_career_revision_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_career_revision_submitted_by").using("btree", table.submittedByUserId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [playerProfiles.id],
			name: "career_revision_requests_player_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.reviewedByUserId],
			foreignColumns: [users.id],
			name: "career_revision_requests_reviewed_by_user_id_fkey"
		}),
	foreignKey({
			columns: [table.submittedByUserId],
			foreignColumns: [users.id],
			name: "career_revision_requests_submitted_by_user_id_fkey"
		}),
	pgPolicy("career_revision_requests_admin_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin(auth.uid())`, withCheck: sql`is_admin(auth.uid())`  }),
	pgPolicy("career_revision_requests_owner_rw", { as: "permissive", for: "all", to: ["authenticated"] }),
	check("career_revision_requests_status_check", sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])`),
]);

export const careerRevisionItems = pgTable("career_revision_items", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	requestId: uuid("request_id").notNull(),
	originalItemId: uuid("original_item_id"),
	club: text().notNull(),
	division: text(),
	startYear: integer("start_year"),
	endYear: integer("end_year"),
	teamId: uuid("team_id"),
	proposedTeamId: uuid("proposed_team_id"),
	orderIndex: integer("order_index").default(0).notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_career_revision_items_original").using("btree", table.originalItemId.asc().nullsLast().op("uuid_ops")),
	index("idx_career_revision_items_request").using("btree", table.requestId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.originalItemId],
			foreignColumns: [careerItems.id],
			name: "career_revision_items_original_item_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.proposedTeamId],
			foreignColumns: [careerRevisionProposedTeams.id],
			name: "career_revision_items_proposed_team_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.requestId],
			foreignColumns: [careerRevisionRequests.id],
			name: "career_revision_items_request_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "career_revision_items_team_id_fkey"
		}).onDelete("set null"),
	pgPolicy("career_revision_items_admin_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin(auth.uid())`, withCheck: sql`is_admin(auth.uid())`  }),
	pgPolicy("career_revision_items_owner_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("career_revision_items_owner_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const careerRevisionProposedTeams = pgTable("career_revision_proposed_teams", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	requestId: uuid("request_id").notNull(),
	name: text().notNull(),
	countryName: text("country_name"),
	countryCode: char("country_code", { length: 2 }),
	transfermarktUrl: text("transfermarkt_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_career_revision_prop_teams_request").using("btree", table.requestId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.requestId],
			foreignColumns: [careerRevisionRequests.id],
			name: "career_revision_proposed_teams_request_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("career_revision_proposed_teams_admin_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin(auth.uid())`, withCheck: sql`is_admin(auth.uid())`  }),
	pgPolicy("career_revision_proposed_teams_owner_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("career_revision_proposed_teams_owner_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const statsSeasons = pgTable("stats_seasons", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id").notNull(),
	season: text().notNull(),
	matches: integer().default(0),
	goals: integer().default(0),
	assists: integer().default(0),
	minutes: integer().default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	competition: text(),
	team: text(),
	yellowCards: integer("yellow_cards").default(0),
	redCards: integer("red_cards").default(0),
	careerItemId: uuid("career_item_id"),
	starts: integer().default(0),
}, (table) => [
	index("idx_stats_player").using("btree", table.playerId.asc().nullsLast().op("uuid_ops")),
	index("idx_stats_seasons_career_item").using("btree", table.careerItemId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.careerItemId],
			foreignColumns: [careerItems.id],
			name: "stats_seasons_career_item_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [playerProfiles.id],
			name: "stats_seasons_player_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("stats_cud", { as: "permissive", for: "all", to: ["public"], using: sql`((EXISTS ( SELECT 1
   FROM player_profiles p
  WHERE ((p.id = stats_seasons.player_id) AND (p.user_id = auth.uid())))) OR is_admin(auth.uid()))`, withCheck: sql`((EXISTS ( SELECT 1
   FROM player_profiles p
  WHERE ((p.id = stats_seasons.player_id) AND (p.user_id = auth.uid())))) OR is_admin(auth.uid()))`  }),
	pgPolicy("stats_select", { as: "permissive", for: "select", to: ["public"] }),
]);

export const managerApplications = pgTable("manager_applications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	fullName: text("full_name").notNull(),
	contactEmail: text("contact_email").notNull(),
	contactPhone: text("contact_phone"),
	agencyName: text("agency_name").notNull(),
	agencyWebsiteUrl: text("agency_website_url"),
	verifiedLink: text("verified_link"),
	agentLicenseUrl: text("agent_license_url"),
	agentLicenseType: text("agent_license_type"),
	idDocUrl: text("id_doc_url"),
	selfieUrl: text("selfie_url"),
	notes: text(),
	status: text().default('pending').notNull(),
	reviewedByUserId: uuid("reviewed_by_user_id"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
export const playerDashboardState = pgView("player_dashboard_state", {	userId: uuid("user_id"),
	userEmail: varchar("user_email", { length: 255 }),
	profileId: uuid("profile_id"),
	profileStatus: playerStatus("profile_status"),
	profileSlug: text("profile_slug"),
	profileVisibility: visibility("profile_visibility"),
	profileFullName: text("profile_full_name"),
	profileBirthDate: date("profile_birth_date"),
	profileNationality: text("profile_nationality"),
	profileNationalityCodes: char("profile_nationality_codes", { length: 2 }),
	profilePositions: text("profile_positions"),
	profileCurrentClub: text("profile_current_club"),
	profileContractStatus: text("profile_contract_status"),
	profileBio: text("profile_bio"),
	profileMarketValueEur: numeric("profile_market_value_eur", { precision: 12, scale:  2 }),
	profileCareerObjectives: text("profile_career_objectives"),
	profileTransfermarktUrl: text("profile_transfermarkt_url"),
	profileAvatarUrl: text("profile_avatar_url"),
	profileFoot: text("profile_foot"),
	profileHeightCm: integer("profile_height_cm"),
	profileWeightKg: integer("profile_weight_kg"),
	profileUpdatedAt: timestamp("profile_updated_at", { withTimezone: true, mode: 'string' }),
	profilePlanPublic: plan("profile_plan_public"),
	personalDetailsId: uuid("personal_details_id"),
	personalDocumentType: text("personal_document_type"),
	personalDocumentNumber: text("personal_document_number"),
	personalDocumentCountry: text("personal_document_country"),
	personalDocumentCountryCode: char("personal_document_country_code", { length: 2 }),
	personalLanguages: text("personal_languages"),
	personalPhone: text("personal_phone"),
	personalResidenceCity: text("personal_residence_city"),
	personalResidenceCountry: text("personal_residence_country"),
	personalResidenceCountryCode: char("personal_residence_country_code", { length: 2 }),
	applicationId: uuid("application_id"),
	applicationStatus: text("application_status"),
	applicationCreatedAt: timestamp("application_created_at", { withTimezone: true, mode: 'string' }),
	applicationPlanRequested: plan("application_plan_requested"),
	applicationTransfermarktUrl: text("application_transfermarkt_url"),
	applicationExternalProfileUrl: text("application_external_profile_url"),
	applicationFullName: text("application_full_name"),
	applicationNationality: text("application_nationality"),
	applicationPositions: text("application_positions"),
	applicationCurrentClub: text("application_current_club"),
	applicationNotes: text("application_notes"),
	subscriptionPlan: plan("subscription_plan"),
	subscriptionStatus: text("subscription_status"),
	primaryPhotoUrl: text("primary_photo_url"),
}).as(sql`SELECT u.id AS user_id, u.email AS user_email, p.id AS profile_id, p.status AS profile_status, p.slug AS profile_slug, p.visibility AS profile_visibility, p.full_name AS profile_full_name, p.birth_date AS profile_birth_date, p.nationality AS profile_nationality, p.nationality_codes AS profile_nationality_codes, p.positions AS profile_positions, p.current_club AS profile_current_club, p.contract_status AS profile_contract_status, p.bio AS profile_bio, p.market_value_eur AS profile_market_value_eur, p.career_objectives AS profile_career_objectives, p.transfermarkt_url AS profile_transfermarkt_url, p.avatar_url AS profile_avatar_url, p.foot AS profile_foot, p.height_cm AS profile_height_cm, p.weight_kg AS profile_weight_kg, p.updated_at AS profile_updated_at, p.plan_public AS profile_plan_public, ppd.id AS personal_details_id, ppd.document_type AS personal_document_type, ppd.document_number AS personal_document_number, ppd.document_country AS personal_document_country, ppd.document_country_code AS personal_document_country_code, ppd.languages AS personal_languages, ppd.phone AS personal_phone, ppd.residence_city AS personal_residence_city, ppd.residence_country AS personal_residence_country, ppd.residence_country_code AS personal_residence_country_code, app.id AS application_id, app.status AS application_status, app.created_at AS application_created_at, app.plan_requested AS application_plan_requested, app.transfermarkt_url AS application_transfermarkt_url, app.external_profile_url AS application_external_profile_url, app.full_name AS application_full_name, app.nationality AS application_nationality, app.positions AS application_positions, app.current_club AS application_current_club, app.notes AS application_notes, sub.plan AS subscription_plan, sub.status AS subscription_status, media.url AS primary_photo_url FROM auth.users u LEFT JOIN player_profiles p ON p.user_id = u.id LEFT JOIN player_personal_details ppd ON ppd.player_id = p.id LEFT JOIN LATERAL ( SELECT pa.id, pa.user_id, pa.plan_requested, pa.full_name, pa.nationality, pa.positions, pa.current_club, pa.transfermarkt_url, pa.external_profile_url, pa.id_doc_url, pa.selfie_url, pa.notes, pa.status, pa.reviewed_by_user_id, pa.reviewed_at, pa.created_at, pa.updated_at, pa.current_team_id, pa.proposed_team_name, pa.proposed_team_country, pa.free_agent, pa.proposed_team_category, pa.proposed_team_transfermarkt_url, pa.proposed_team_country_code, pa.personal_info_approved FROM player_applications pa WHERE pa.user_id = u.id ORDER BY pa.created_at DESC LIMIT 1) app ON true LEFT JOIN subscriptions sub ON sub.user_id = u.id LEFT JOIN LATERAL ( SELECT pm.url FROM player_media pm WHERE pm.player_id = p.id AND pm.type = 'photo'::media_type AND pm.is_primary = true AND pm.is_approved = true ORDER BY pm.created_at DESC LIMIT 1) media ON true`);

export const playerDashboardPublishingState = pgView("player_dashboard_publishing_state", {	playerId: uuid("player_id"),
	userId: uuid("user_id"),
	themeSettings: jsonb("theme_settings"),
	links: jsonb(),
	sections: jsonb(),
	honours: jsonb(),
	stats: jsonb(),
}).as(sql`SELECT p.id AS player_id, p.user_id, to_jsonb(theme.*) - 'player_id'::text AS theme_settings, COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', l.id, 'label', l.label, 'url', l.url, 'kind', l.kind, 'is_primary', l.is_primary, 'metadata', l.metadata, 'created_at', l.created_at, 'updated_at', l.updated_at) ORDER BY l.is_primary DESC, l.created_at DESC) AS jsonb_agg FROM player_links l WHERE l.player_id = p.id), '[]'::jsonb) AS links, COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', s.id, 'section', s.section, 'visible', s.visible, 'settings', s.settings, 'created_at', s.created_at, 'updated_at', s.updated_at) ORDER BY s.section) AS jsonb_agg FROM profile_sections_visibility s WHERE s.player_id = p.id), '[]'::jsonb) AS sections, COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', h.id, 'title', h.title, 'competition', h.competition, 'season', h.season, 'awarded_on', h.awarded_on, 'description', h.description, 'created_at', h.created_at, 'updated_at', h.updated_at) ORDER BY h.awarded_on DESC NULLS LAST, h.created_at DESC) AS jsonb_agg FROM player_honours h WHERE h.player_id = p.id), '[]'::jsonb) AS honours, COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', st.id, 'season', st.season, 'competition', st.competition, 'team', st.team, 'matches', st.matches, 'minutes', st.minutes, 'goals', st.goals, 'assists', st.assists, 'yellow_cards', st.yellow_cards, 'red_cards', st.red_cards, 'created_at', st.created_at, 'career_item_id', st.career_item_id, 'team_crest_url', tm.crest_url) ORDER BY st.season DESC, st.created_at DESC) AS jsonb_agg FROM stats_seasons st LEFT JOIN career_items ci ON ci.id = st.career_item_id LEFT JOIN teams tm ON tm.id = ci.team_id WHERE st.player_id = p.id), '[]'::jsonb) AS stats FROM player_profiles p LEFT JOIN profile_theme_settings theme ON theme.player_id = p.id`);

export const careerRevisionInbox = pgView("career_revision_inbox", {	id: uuid(),
	playerId: uuid("player_id"),
	fullName: text("full_name"),
	status: text(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	resolutionNote: text("resolution_note"),
	snapshotItems: integer("snapshot_items"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	requestedItems: bigint("requested_items", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	proposedTeams: bigint("proposed_teams", { mode: "number" }),
}).as(sql`SELECT crr.id, crr.player_id, pp.full_name, crr.status, crr.submitted_at, crr.reviewed_at, crr.resolution_note, COALESCE(jsonb_array_length(crr.current_snapshot), 0) AS snapshot_items, ( SELECT count(*) AS count FROM career_revision_items cri WHERE cri.request_id = crr.id) AS requested_items, ( SELECT count(*) AS count FROM career_revision_proposed_teams crt WHERE crt.request_id = crr.id) AS proposed_teams FROM career_revision_requests crr JOIN player_profiles pp ON pp.id = crr.player_id`);