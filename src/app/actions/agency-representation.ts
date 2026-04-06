"use server";

import { db } from "@/lib/db";
import { playerProfiles, profileChangeLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { sendPlayerDisconnectEmail } from "@/lib/resend";
import { revalidatePath } from "next/cache";

export async function disconnectFromAgency() {
  const supabase = await createSupabaseServerRSC();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) return { error: "No autorizado" };

  const pp = await db.query.playerProfiles.findFirst({
    where: eq(playerProfiles.userId, user.id),
    with: { agency: true }
  });

  if (!pp || !pp.agencyId || !pp.agency) {
    return { error: "No estás vinculado a ninguna agencia actualmente." };
  }

  try {
    const oldAgencyId = pp.agencyId;
    const agencyName = pp.agency.name;

    await db.transaction(async (tx) => {
      // 1. Remove agency connection
      await tx.update(playerProfiles)
        .set({ agencyId: null })
        .where(eq(playerProfiles.id, pp.id));

      // 2. Track it
      await tx.insert(profileChangeLogs).values({
        playerId: pp.id,
        userId: user.id,
        field: "agency_id",
        oldValue: oldAgencyId,
        newValue: null
      });
    });

    // 3. Notify agency via Email
    // We need to fetch any manager from that agency to send them an email
    const managers = await db.query.userProfiles.findMany({
      where: (profiles, { eq, and }) => and(
        eq(profiles.agencyId, oldAgencyId),
        eq(profiles.role, "manager")
      )
    });

    // Get auth.users for those managers to get their emails
    for (const manager of managers) {
      const { data: { user: managerUser } } = await supabase.auth.admin.getUserById(manager.userId);
      if (managerUser && managerUser.email) {
        await sendPlayerDisconnectEmail(managerUser.email, pp.fullName || "Un Jugador", agencyName);
      }
    }

    revalidatePath("/dashboard/edit-profile/football-data");
    revalidatePath(`/${pp.slug}`);
    
    return { success: true };
  } catch (error) {
    console.error("Error disconnecting from agency", error);
    return { error: error instanceof Error ? error.message : "Error al desvincularte." };
  }
}
