// Admin player-edit side-effects, split into two phases:
//
//  1. recordAdminPlayerEdit  — runs on EVERY save: per-field change log + audit
//     row + cache revalidation. Silent (no email / no in-app toast).
//  2. sendAdminReviewNotification — runs when the admin clicks "Finalizar
//     revisión" and writes a note: the email + persistent in-app notification
//     that carry the admin's note to the player. This is the deliberate,
//     note-driven notification (the admin corrects AND explains why).
//
// Every step is independently try/catch'd and non-fatal: the live DB write
// already succeeded, so a failed email/notification must never surface as an
// error to the admin.

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { auditLogs, profileChangeLogs } from "@/db/schema";
import { createNotification } from "@/lib/notifications/server";
import { sendAdminProfileCorrectedEmail, sendNationalTeamReviewedEmail } from "@/lib/resend";
import { revalidatePlayerPublicProfileById } from "@/lib/seo/revalidate";
import type { AdminActor } from "@/lib/admin/auth";
import type { AdminEditDomain } from "@/lib/admin/edit-domains";

export type ChangeLogEntry = { field: string; oldValue: unknown; newValue: unknown };

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Per-save: change log + audit + revalidate. Silent (notification is deferred
 * to the "Finalizar revisión" note). */
export async function recordAdminPlayerEdit(args: {
  actor: AdminActor;
  /** player_profiles.id of the edited player. */
  playerId: string;
  /** player_profiles.user_id — recorded in the audit meta. */
  targetUserId: string;
  domain: AdminEditDomain;
  /** human-readable labels of what changed (e.g. "Valor de mercado"). */
  changedFields: string[];
  /** optional per-field diff for profile_change_logs. */
  changeLog?: ChangeLogEntry[];
}): Promise<void> {
  const { actor, playerId, targetUserId, domain, changedFields, changeLog } = args;

  if (changedFields.length === 0) return;

  // 1. profile_change_logs — per-field diff (actor = admin).
  if (changeLog && changeLog.length > 0) {
    try {
      await db.insert(profileChangeLogs).values(
        changeLog.map((c) => ({
          playerId,
          userId: actor.actorId,
          field: c.field,
          oldValue: c.oldValue ?? null,
          newValue: c.newValue ?? null,
        })),
      );
    } catch (err) {
      console.warn("[admin-notify] change-log write failed (non-fatal):", errMsg(err));
    }
  }

  // 2. audit_logs — one row per edit.
  try {
    await db.insert(auditLogs).values({
      userId: actor.actorId,
      actorIp: actor.actorIp,
      action: `admin.player.edit.${domain}`,
      subjectTable: "player_profiles",
      subjectId: playerId,
      meta: { domain, changedFields, targetUserId },
    });
  } catch (err) {
    console.warn("[admin-notify] audit write failed (non-fatal):", errMsg(err));
  }

  // 3. revalidate public profile + admin surfaces.
  try {
    await revalidatePlayerPublicProfileById(actor.adminClient, playerId);
    revalidatePath("/admin/players");
    revalidatePath(`/admin/players/${playerId}/edit/${domain}`);
    if (domain === "trayectoria") revalidatePath("/dashboard", "layout");
  } catch (err) {
    console.warn("[admin-notify] revalidate failed (non-fatal):", errMsg(err));
  }
}

/** Lightweight audit-only record for the media/article API routes (which write
 * via their own service-role client and don't produce a per-field diff). */
export async function recordAdminPlayerAudit(args: {
  actorId: string;
  actorIp: string | null;
  playerId: string;
  targetUserId?: string;
  domain: AdminEditDomain;
  action: string;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: args.actorId,
      actorIp: args.actorIp,
      action: `admin.player.${args.action}`,
      subjectTable: "player_profiles",
      subjectId: args.playerId,
      meta: { domain: args.domain, targetUserId: args.targetUserId ?? null },
    });
  } catch (err) {
    console.warn("[admin-notify] media audit write failed (non-fatal):", errMsg(err));
  }
}

/** "Finalizar revisión": email + persistent in-app notification carrying the
 * admin's note. The note is the admin's explanation of what was reviewed. */
export async function sendAdminReviewNotification(args: {
  actor: AdminActor;
  playerId: string;
  targetUserId: string;
  playerName: string;
  domain: AdminEditDomain;
  note: string;
}): Promise<void> {
  const { actor, playerId, targetUserId, playerName, domain, note } = args;

  // 1. persistent in-app notification → on-login toast.
  try {
    await createNotification({
      recipientUserId: targetUserId,
      kind: "admin.profileCorrected",
      payload: { domain, note },
      subjectTable: "player_profiles",
      subjectId: playerId,
      actorUserId: actor.actorId,
    });
  } catch (err) {
    console.warn("[admin-notify] notification write failed (non-fatal):", errMsg(err));
  }

  // 2. correction email with the note — resolve the recipient email via auth.users.
  try {
    const { data } = await actor.adminClient.auth.admin.getUserById(targetUserId);
    const email = data?.user?.email ?? null;
    if (email) {
      await sendAdminProfileCorrectedEmail({ email, playerName, domain, note });
    }
  } catch (err) {
    console.warn("[admin-notify] correction email failed (non-fatal):", errMsg(err));
  }
}

/** Approve/reject of a "Selección Nacional" stint from the admin queue: in-app
 * notification + email carrying the optional resolution note. Both steps are
 * non-fatal — the moderation row write already succeeded. */
export async function sendNationalTeamReviewedNotification(args: {
  actor: AdminActor;
  /** auth user id of the player who owns the stint. */
  recipientUserId: string;
  playerName: string;
  result: "approved" | "rejected";
  /** stint id — recorded as the notification subject. */
  stintId: string;
  note: string | null;
}): Promise<void> {
  const { actor, recipientUserId, playerName, result, stintId, note } = args;
  const kind =
    result === "approved" ? "admin.nationalTeamApproved" : "admin.nationalTeamRejected";

  // 1. persistent in-app notification → on-login toast.
  try {
    await createNotification({
      recipientUserId,
      kind,
      payload: { note: note ?? null },
      subjectTable: "national_team_stints",
      subjectId: stintId,
      actorUserId: actor.actorId,
    });
  } catch (err) {
    console.warn("[admin-notify] national-team notification write failed (non-fatal):", errMsg(err));
  }

  // 2. result email with the note — resolve the recipient email via auth.users.
  try {
    const { data } = await actor.adminClient.auth.admin.getUserById(recipientUserId);
    const email = data?.user?.email ?? null;
    if (email) {
      await sendNationalTeamReviewedEmail({ email, playerName, result, note });
    }
  } catch (err) {
    console.warn("[admin-notify] national-team email failed (non-fatal):", errMsg(err));
  }
}
