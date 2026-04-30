import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Marketing email foundation.
 *
 * Source-of-truth lives in our DB; Resend is only used as the SMTP/API.
 * Any campaign send filters through `marketing_unsubscribes` (suppression list)
 * and a per-recipient frequency cap before hitting Resend's batch API.
 */

// ----------------------------------------------------------------------------
// Subscriptions — one row per email that has opted in (with consent granularity)
// ----------------------------------------------------------------------------
export const marketingSubscriptions = pgTable(
  "marketing_subscriptions",
  {
    email: text("email").primaryKey(),
    userId: uuid("user_id"), // null when the email is only a portfolio lead
    source: text("source").notNull(), // 'signup' | 'profile' | 'portfolio_lead' | 'admin_import' | 'manual'

    // Granular consent flags. Toggle OFF to silence a category without removing the row.
    consentProduct: boolean("consent_product").notNull().default(true),
    consentOffers: boolean("consent_offers").notNull().default(false),
    consentProFeatures: boolean("consent_pro_features").notNull().default(false),

    // Engagement metrics — kept in sync by the Resend webhook.
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
    lastClickedAt: timestamp("last_clicked_at", { withTimezone: true }),
    totalSends: integer("total_sends").notNull().default(0),
    totalOpens: integer("total_opens").notNull().default(0),
    totalClicks: integer("total_clicks").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    bySource: index("marketing_subscriptions_source_idx").on(table.source),
    byUser: index("marketing_subscriptions_user_idx").on(table.userId),
  }),
);

// ----------------------------------------------------------------------------
// Unsubscribes — global suppression list. Always filtered out of every send.
// ----------------------------------------------------------------------------
export const marketingUnsubscribes = pgTable("marketing_unsubscribes", {
  email: text("email").primaryKey(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }).defaultNow().notNull(),
  reason: text("reason").notNull().default("user_request"), // 'user_request' | 'bounce_hard' | 'complaint' | 'global_pause'
  campaignId: uuid("campaign_id"), // which campaign triggered the unsub (if any)
});

// ----------------------------------------------------------------------------
// Campaigns — admin-created marketing pushes (broadcasts, drips, digests)
// ----------------------------------------------------------------------------
export const marketingCampaigns = pgTable(
  "marketing_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(), // human-readable identifier, e.g. 'launch-pro-2026-q2'
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    preheader: text("preheader"), // hidden preview text shown in inbox listings

    // Reference to the React Email template registered in /src/emails/templates
    templateKey: text("template_key").notNull(),

    // Snapshot of the audience filter at send time (jsonb so it's queryable + auditable).
    // Shape: { segment: 'pro_players' | 'leads' | 'registered' | 'custom', filters?: {...} }
    audienceFilter: jsonb("audience_filter").notNull(),

    // Template-specific props (headline, body, CTA, etc.) — re-rendered
    // at send time via the registry. Shape varies by `templateKey`.
    templateProps: jsonb("template_props").notNull().default({}),

    status: text("status").notNull().default("draft"), // draft | scheduled | sending | sent | paused | failed
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),

    // Stats — kept in sync by the dispatcher and the Resend webhook.
    totalRecipients: integer("total_recipients").notNull().default(0),
    totalSent: integer("total_sent").notNull().default(0),
    totalDelivered: integer("total_delivered").notNull().default(0),
    totalOpened: integer("total_opened").notNull().default(0),
    totalClicked: integer("total_clicked").notNull().default(0),
    totalBounced: integer("total_bounced").notNull().default(0),
    totalComplained: integer("total_complained").notNull().default(0),

    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex("marketing_campaigns_slug_unique").on(table.slug),
    byStatus: index("marketing_campaigns_status_idx").on(table.status),
  }),
);

// ----------------------------------------------------------------------------
// Sends — every individual delivery attempt (idempotency + per-recipient analytics)
// ----------------------------------------------------------------------------
export const marketingSends = pgTable(
  "marketing_sends",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id").references(() => marketingCampaigns.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    resendMessageId: text("resend_message_id"), // null until Resend returns one
    status: text("status").notNull().default("queued"), // queued | sent | delivered | opened | clicked | bounced | complained | failed
    error: text("error"), // populated when status = failed
    sentAt: timestamp("sent_at", { withTimezone: true }),
    lastEventAt: timestamp("last_event_at", { withTimezone: true }),
  },
  (table) => ({
    campaignEmailUnique: uniqueIndex("marketing_sends_campaign_email_unique").on(
      table.campaignId,
      table.email,
    ),
    byMessageId: index("marketing_sends_message_id_idx").on(table.resendMessageId),
    byEmail: index("marketing_sends_email_idx").on(table.email),
    byStatus: index("marketing_sends_status_idx").on(table.status),
  }),
);

// ----------------------------------------------------------------------------
// Email events — raw Resend webhook payloads (audit trail + retries)
// ----------------------------------------------------------------------------
export const marketingEmailEvents = pgTable(
  "marketing_email_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resendMessageId: text("resend_message_id"),
    eventType: text("event_type").notNull(), // delivered | opened | clicked | bounced | complained | sent | delivery_delayed
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    byMessageId: index("marketing_email_events_message_id_idx").on(table.resendMessageId),
    byType: index("marketing_email_events_type_idx").on(table.eventType),
  }),
);

export type MarketingSubscription = InferSelectModel<typeof marketingSubscriptions>;
export type NewMarketingSubscription = InferInsertModel<typeof marketingSubscriptions>;
export type MarketingUnsubscribe = InferSelectModel<typeof marketingUnsubscribes>;
export type NewMarketingUnsubscribe = InferInsertModel<typeof marketingUnsubscribes>;
export type MarketingCampaign = InferSelectModel<typeof marketingCampaigns>;
export type NewMarketingCampaign = InferInsertModel<typeof marketingCampaigns>;
export type MarketingSend = InferSelectModel<typeof marketingSends>;
export type NewMarketingSend = InferInsertModel<typeof marketingSends>;
export type MarketingEmailEvent = InferSelectModel<typeof marketingEmailEvents>;
export type NewMarketingEmailEvent = InferInsertModel<typeof marketingEmailEvents>;
