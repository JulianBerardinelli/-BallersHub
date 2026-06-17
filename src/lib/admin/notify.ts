// One shared side-effect helper for every admin player edit. Bundles the
// after-write work — per-field change log, audit row, persistent in-app
// notification, correction email, and cache revalidation — so each admin
// action stays small. EVERY step is independently try/catch'd and non-fatal:
// the live DB write already succeeded by the time we get here, so a failed
// email/notification must never surface as an error to the admin.

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { auditLogs, profileChangeLogs } from "@/db/schema";
import { createNotification } from "@/lib/notifications/server";
import { sendAdminProfileCorrectedEmail } from "@/lib/resend";
import { revalidatePlayerPublicProfileById } from "@/lib/seo/revalidate";
import type { AdminActor } from "@/lib/admin/auth";
import type { AdminEditDomain } from "@/lib/admin/edit-domains";

export type ChangeLogEntry = { field: string; oldValue: unknown; newValue: unknown };

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function recordAdminPlayerEdit(args: {
  actor: AdminActor;
  /** player_profiles.id of the edited player. */
  playerId: string;
  /** player_profiles.user_id — recipient of the notification + email. */
  targetUserId: string;
  /** player full name, for the email greeting. */
  playerName: string;
  domain: AdminEditDomain;
  /** human-readable labels of what changed (e.g. "Valor de mercado"). */
  changedFields: string[];
  /** optional per-field diff for profile_change_logs. */
  changeLog?: ChangeLogEntry[];
}): Promise<void> {
  const { actor, playerId, targetUserId, playerName, domain, changedFields, changeLog } =
    args;

  // Nothing changed → skip the whole side-effect chain (no spurious
  // notifications/emails when an admin saves an unchanged form).
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

  // 3. persistent in-app notification → on-login toast (NotificationBootstrap).
  try {
    await createNotification({
      recipientUserId: targetUserId,
      kind: "admin.profileCorrected",
      payload: { domain, changedFields },
      subjectTable: "player_profiles",
      subjectId: playerId,
      actorUserId: actor.actorId,
    });
  } catch (err) {
    console.warn("[admin-notify] notification write failed (non-fatal):", errMsg(err));
  }

  // 4. correction email — resolve the recipient email via auth.users.
  try {
    const { data } = await actor.adminClient.auth.admin.getUserById(targetUserId);
    const email = data?.user?.email ?? null;
    if (email) {
      await sendAdminProfileCorrectedEmail({ email, playerName, domain, changedFields });
    }
  } catch (err) {
    console.warn("[admin-notify] correction email failed (non-fatal):", errMsg(err));
  }

  // 5. revalidate public profile + admin surfaces.
  try {
    await revalidatePlayerPublicProfileById(actor.adminClient, playerId);
    revalidatePath("/admin/players");
    revalidatePath(`/admin/players/${playerId}/edit/${domain}`);
    // Trajectory also feeds the player's own dashboard editor.
    if (domain === "trayectoria") revalidatePath("/dashboard", "layout");
  } catch (err) {
    console.warn("[admin-notify] revalidate failed (non-fatal):", errMsg(err));
  }
}
