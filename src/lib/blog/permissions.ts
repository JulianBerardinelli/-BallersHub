// Server-side permission helpers for the blog system.
//
// Two gates:
//   - isBlogger: user with user_profiles.is_blogger = true (whitelisted by admin)
//   - isAdmin: user with user_profiles.role = 'admin'
//
// Mirrors the pattern used by src/app/api/admin/_utils.ts — keeps the
// role check in application code as a defense-in-depth layer on top of
// the RLS policies. RLS would already block the DB op, but failing
// early at the page/action layer gives a nicer 403 UX.

import { db } from "@/lib/db";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

export type BlogActor = {
  userId: string;
  isBlogger: boolean;
  isAdmin: boolean;
};

/**
 * Resolve the current logged-in user's blog-system status.
 * Returns null when no session exists (anon visitor).
 *
 * Use this in server components / page bodies; for server actions
 * prefer `requireBlogger` or `requireAdmin` below.
 */
export async function getBlogActor(): Promise<BlogActor | null> {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const rows = await db
    .select({
      role: userProfiles.role,
      isBlogger: userProfiles.isBlogger,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id))
    .limit(1);

  const profile = rows[0];
  return {
    userId: user.id,
    isBlogger: profile?.isBlogger ?? false,
    isAdmin: profile?.role === "admin",
  };
}

/**
 * Throws when caller is not a whitelisted blogger. Use in server
 * actions before any blog-write operation.
 */
export async function requireBlogger(): Promise<{ userId: string }> {
  const actor = await getBlogActor();
  if (!actor) throw new Error("UNAUTHENTICATED");
  if (!actor.isBlogger && !actor.isAdmin) throw new Error("NOT_BLOGGER");
  return { userId: actor.userId };
}

/**
 * Throws when caller is not admin. Use in server actions for
 * approve/reject/unpublish/delete operations.
 */
export async function requireBlogAdmin(): Promise<{ userId: string }> {
  const actor = await getBlogActor();
  if (!actor) throw new Error("UNAUTHENTICATED");
  if (!actor.isAdmin) throw new Error("NOT_ADMIN");
  return { userId: actor.userId };
}
