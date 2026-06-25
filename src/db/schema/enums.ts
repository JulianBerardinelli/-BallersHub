// Enums
import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["member","player","coach","manager","reviewer","admin","moderator","analyst"]);
export const visibilityEnum = pgEnum("visibility", ["public","private"]);
export const mediaTypeEnum = pgEnum("media_type", ["photo","video","doc"]);
export const reviewStatusEnum = pgEnum("review_status", ["pending","approved","rejected"]);
export const planEnum = pgEnum("plan", ["free","pro","pro_plus"]);
export const reviewerPermStatusEnum = pgEnum("reviewer_perm_status", ["pending","granted","revoked"]);
export const inviteStatusEnum = pgEnum("invite_status", ["sent","accepted","expired","revoked"]);
export const playerStatusEnum = pgEnum("player_status", ["draft","pending_review","approved","rejected"]);
// Gender / competition category (men's vs women's football). `unspecified`
// lets a player opt out of disclosing it. Default is `male` (see column
// defaults in players.ts / applications.ts) to keep legacy rows + the common
// case zero-friction; women explicitly pick `female` during onboarding.
export const genderEnum = pgEnum("gender", ["male","female","unspecified"]);

// Staff role taxonomy (the 13 "oficios" del cuerpo técnico). Distinct from the
// auth `role` enum (member/player/coach/...) — that's the permissions axis; this
// is the job-title axis for the staff vertical. `head_coach`/`assistant_head_coach`/
// `assistant_coach` are the head-coach group that unlocks the DT layout (Ideas de
// Juego); the rest get the universal layout. Used by `coach_profiles.primary_role`
// + `secondary_roles[]` and `coach_career_items.roles[]`. See docs/staff/PLAN.md §3.
export const staffRoleTypeEnum = pgEnum("staff_role_type", [
  "head_coach",
  "assistant_head_coach",
  "assistant_coach",
  "fitness_coach",
  "rehab_physio",
  "goalkeeping_coach",
  "set_piece_coach",
  "tactical_analyst",
  "data_analyst",
  "scouting",
  "sporting_director",
  "academy_coordinator",
  "methodology_director",
]);
export type StaffRoleType = (typeof staffRoleTypeEnum.enumValues)[number];

export const teamStatusEnum = pgEnum("team_status", ["pending","approved","rejected"]);
export const divisionStatusEnum = pgEnum("division_status", ["pending","approved","rejected"]);
export const teamKindEnum = pgEnum("team_kind", ["club","national","academy","amateur"]);
export type TeamStatus = (typeof teamStatusEnum.enumValues)[number];
export type TeamKind = (typeof teamKindEnum.enumValues)[number];

// --------------------------------------------------------------
// Checkout / billing enums
// --------------------------------------------------------------

export const checkoutCurrencyEnum = pgEnum("checkout_currency", ["USD", "ARS", "EUR"]);
export const checkoutProcessorEnum = pgEnum("checkout_processor", ["stripe", "mercado_pago"]);
export const checkoutSessionStatusEnum = pgEnum("checkout_session_status", [
  "pending",
  "redirected",
  "completed",
  "expired",
  "failed",
]);
export const subscriptionStatusV2Enum = pgEnum("subscription_status_v2", [
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "paused",
]);
export const taxIdTypeEnum = pgEnum("tax_id_type", [
  "dni",
  "cuit",
  "cuil",
  "nie",
  "nif",
  "vat",
  "other",
]);

export type CheckoutCurrency = (typeof checkoutCurrencyEnum.enumValues)[number];
export type CheckoutProcessor = (typeof checkoutProcessorEnum.enumValues)[number];
export type CheckoutSessionStatus = (typeof checkoutSessionStatusEnum.enumValues)[number];
export type SubscriptionStatusV2 = (typeof subscriptionStatusV2Enum.enumValues)[number];
export type TaxIdType = (typeof taxIdTypeEnum.enumValues)[number];

export type Visibility = (typeof visibilityEnum.enumValues)[number];
export type PlayerStatus = (typeof playerStatusEnum.enumValues)[number];
export type Gender = (typeof genderEnum.enumValues)[number];

// --------------------------------------------------------------
// Blog enums
// --------------------------------------------------------------

export const blogClusterEnum = pgEnum("blog_cluster", [
  "career_guidance",
  "agency_ops",
  "industry_ar",
]);

export const blogStatusEnum = pgEnum("blog_status", [
  "draft",
  "pending_review",
  "published",
  "rejected",
]);

export type BlogCluster = (typeof blogClusterEnum.enumValues)[number];
export type BlogStatus = (typeof blogStatusEnum.enumValues)[number];
