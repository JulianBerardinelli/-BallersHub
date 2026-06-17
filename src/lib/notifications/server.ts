// Server-only helper to persist an in-app notification.
//
// Inserts via Drizzle `db` (rol postgres, bypass RLS). The recipient reads
// their unread rows in the dashboard layout, which feeds NotificationBootstrap
// (on-login toast). RLS on the table is defense-in-depth for direct JS-client
// access + a future notification center. See src/db/schema/notifications.ts.

import { db } from "@/lib/db";
import { notifications } from "@/db/schema";

export type CreateNotificationInput = {
  /** auth user id of the recipient (player_profiles.user_id). */
  recipientUserId: string;
  /** stable builder key, e.g. "admin.profileCorrected". */
  kind: string;
  /** structured context for the client builder, e.g. { domain, changedFields }. */
  payload?: Record<string, unknown> | null;
  subjectTable?: string | null;
  subjectId?: string | null;
  actorUserId?: string | null;
};

/** Persist one notification. Returns the new row id (null if the insert failed). */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<string | null> {
  const [row] = await db
    .insert(notifications)
    .values({
      recipientUserId: input.recipientUserId,
      kind: input.kind,
      payload: input.payload ?? null,
      subjectTable: input.subjectTable ?? null,
      subjectId: input.subjectId ?? null,
      actorUserId: input.actorUserId ?? null,
    })
    .returning({ id: notifications.id });

  return row?.id ?? null;
}
