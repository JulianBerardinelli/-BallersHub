import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userProfiles } from "@/db/schema";

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
