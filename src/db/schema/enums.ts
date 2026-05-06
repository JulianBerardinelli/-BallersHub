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
