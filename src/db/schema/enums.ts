// Enums
import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["player","coach","manager","reviewer","admin"]);
export const visibilityEnum = pgEnum("visibility", ["public","private"]);
export const mediaTypeEnum = pgEnum("media_type", ["photo","video","doc"]);
export const reviewStatusEnum = pgEnum("review_status", ["pending","approved","rejected"]);
export const planEnum = pgEnum("plan", ["free","pro","pro_plus"]);
export const reviewerPermStatusEnum = pgEnum("reviewer_perm_status", ["pending","granted","revoked"]);
export const inviteStatusEnum = pgEnum("invite_status", ["sent","accepted","expired","revoked"]);
export const playerStatusEnum = pgEnum("player_status", ["draft","pending_review","approved","rejected"]);


export type Visibility = (typeof visibilityEnum.enumValues)[number];
export type PlayerStatus = (typeof playerStatusEnum.enumValues)[number];
