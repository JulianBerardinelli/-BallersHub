// Admin coach-edit side-effects — the coach mirror of @/lib/admin/notify, split
// into two phases:
//
//  1. recordAdminCoachEdit — runs on EVERY save: audit row + cache revalidation.
//     Silent (no email / no in-app toast). Unlike the player flow there is no
//     per-field change log (coach has no profile_change_logs table).
//  2. sendAdminCoachReviewNotification — runs when the admin clicks "Finalizar
//     revisión" and writes a note: the email + persistent in-app notification
//     that carry the admin's note to the coach.
//
// Every step is independently try/catch'd and non-fatal: the live DB write
// already succeeded, so a failed email/notification must never surface as an
// error to the admin.

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { auditLogs } from "@/db/schema";
import { createNotification } from "@/lib/notifications/server";
import { sendAdminCoachProfileCorrectedEmail } from "@/lib/resend";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";
import type { AdminActor } from "@/lib/admin/auth";
import type { CoachAdminEditDomain } from "@/lib/admin/coach-edit-sections";

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Per-save: audit + revalidate. Silent (the note is deferred to the "Finalizar
 * revisión" note). */
export async function recordAdminCoachEdit(args: {
  actor: AdminActor;
  /** coach_profiles.id of the edited coach. */
  coachId: string;
  /** coach_profiles.user_id — recorded in the audit meta. */
  targetUserId?: string | null;
  /** coach_profiles.slug — for public revalidation (resolved if absent). */
  slug?: string | null;
  domain: CoachAdminEditDomain;
  /** human-readable labels of what changed (e.g. "Trayectoria"). */
  changedFields: string[];
}): Promise<void> {
  const { actor, coachId, targetUserId, domain, changedFields } = args;

  if (changedFields.length === 0) return;

  // 1. audit_logs — one row per edit.
  try {
    await db.insert(auditLogs).values({
      userId: actor.actorId,
      actorIp: actor.actorIp,
      action: `admin.coach.edit.${domain}`,
      subjectTable: "coach_profiles",
      subjectId: coachId,
      meta: { domain, changedFields, targetUserId: targetUserId ?? null },
    });
  } catch (err) {
    console.warn("[admin-coach-notify] audit write failed (non-fatal):", errMsg(err));
  }

  // 2. revalidate public profile + admin surfaces.
  try {
    let slug = args.slug ?? null;
    if (!slug) {
      const { data } = await actor.adminClient
        .from("coach_profiles")
        .select("slug")
        .eq("id", coachId)
        .maybeSingle<{ slug: string | null }>();
      slug = data?.slug ?? null;
    }
    if (slug) revalidateCoachPublicProfile(slug);
    revalidatePath("/admin/coaches");
    revalidatePath(`/admin/coaches/${coachId}/edit/${domain}`);
  } catch (err) {
    console.warn("[admin-coach-notify] revalidate failed (non-fatal):", errMsg(err));
  }
}

/** "Finalizar revisión": email + persistent in-app notification carrying the
 * admin's note. The note is the admin's explanation of what was reviewed. The
 * payload stores the `domain`; the coach dashboard loader resolves the section
 * label + href from it (mirrors the player flow). */
export async function sendAdminCoachReviewNotification(args: {
  actor: AdminActor;
  coachId: string;
  targetUserId: string;
  coachName: string;
  domain: CoachAdminEditDomain;
  note: string;
}): Promise<void> {
  const { actor, coachId, targetUserId, coachName, domain, note } = args;

  // 1. persistent in-app notification → on-login toast.
  try {
    await createNotification({
      recipientUserId: targetUserId,
      kind: "admin.coachProfileCorrected",
      payload: { domain, note },
      subjectTable: "coach_profiles",
      subjectId: coachId,
      actorUserId: actor.actorId,
    });
  } catch (err) {
    console.warn("[admin-coach-notify] notification write failed (non-fatal):", errMsg(err));
  }

  // 2. correction email with the note — resolve the recipient email via auth.users.
  try {
    const { data } = await actor.adminClient.auth.admin.getUserById(targetUserId);
    const email = data?.user?.email ?? null;
    if (email) {
      await sendAdminCoachProfileCorrectedEmail({ email, coachName, domain, note });
    }
  } catch (err) {
    console.warn("[admin-coach-notify] correction email failed (non-fatal):", errMsg(err));
  }
}
