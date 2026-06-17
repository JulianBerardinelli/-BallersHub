import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { userProfiles } from "@/db/schema";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const ADMIN_ROLES = new Set(["admin", "moderator", "analyst"]);

/**
 * Returns true if the auth user has an elevated role in user_profiles.
 * Centralized so admin server actions don't each re-implement the check.
 */
export async function isAdmin(authUserId: string): Promise<boolean> {
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, authUserId),
    columns: { role: true },
  });
  if (!profile) return false;
  return ADMIN_ROLES.has(profile.role);
}

export type AdminActor = {
  actorId: string;
  actorIp: string | null;
  /** Service-role client — bypasses RLS to write another user's rows. */
  adminClient: ReturnType<typeof createSupabaseAdmin>;
};

/**
 * Gate for the most privileged mutation in the app: editing ALL of a player's
 * data directly (bypassing the review queue). Restricted to `role === "admin"`
 * ONLY (NOT the broader moderator/analyst set that `isAdmin` allows) — matches
 * the bar of the career-approve route. Returns the actor id + IP (for audit)
 * and a service-role client. Enforce this in BOTH the route guard and every
 * action (defense in depth).
 */
export async function ensureAdminActor(): Promise<
  | { ok: true; actor: AdminActor }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
    columns: { role: true },
  });
  if (profile?.role !== "admin") {
    return { ok: false, error: "Solo administradores" };
  }

  const h = await headers();
  const actorIp =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;

  return {
    ok: true,
    actor: { actorId: user.id, actorIp, adminClient: createSupabaseAdmin() },
  };
}
