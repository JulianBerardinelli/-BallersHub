import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { userProfiles } from "@/db/schema";

/**
 * Shared auth + role guard for the agency dashboard sub-routes. Redirects to
 * sign-in when logged out; returns `null` when the user isn't an approved
 * manager-with-agency (the caller renders `<AgencyRestricted />`). Otherwise
 * returns the resolved Supabase user + user profile + agency row.
 *
 * Replaces the per-page auth/guard boilerplate that previously lived inline in
 * the monolithic agency page.
 */
export async function requireManagerAgency() {
  const supa = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const up = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
    with: { agency: true },
  });

  if (!up || up.role !== "manager" || !up.agencyId || !up.agency) {
    return null;
  }

  return { user, up, agency: up.agency };
}
