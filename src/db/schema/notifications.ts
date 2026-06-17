// notifications
// Persistent in-app notifications. Drives the on-login toast feed (read by the
// dashboard layout → NotificationBootstrap) and a future notification center.
// `read_at` null = unread. Inserts are service-role only (e.g. admin player
// edits); the recipient can read and mark their own rows read. RLS + GRANTs live
// in the complementary 0014a_notifications_rls.sql (Drizzle no maneja GRANTs).

import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // auth user id of the recipient (matches player_profiles.user_id).
    recipientUserId: uuid("recipient_user_id").notNull(),
    // stable key consumed by the client notification builder, e.g.
    // "admin.profileCorrected". Future bell-center keys reuse this column.
    kind: text("kind").notNull(),
    // structured context so the client renders copy without re-querying,
    // e.g. { domain, changedFields }.
    payload: jsonb("payload"),
    // provenance (what was touched + by whom).
    subjectTable: text("subject_table"),
    subjectId: uuid("subject_id"),
    actorUserId: uuid("actor_user_id"),
    // null = unread. Drives the unread query + a future "mark all read".
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    recipientReadIdx: index("notifications_recipient_read_at_idx").on(
      table.recipientUserId,
      table.readAt,
    ),
    recipientCreatedIdx: index("notifications_recipient_created_at_idx").on(
      table.recipientUserId,
      table.createdAt,
    ),
  }),
);

export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;
