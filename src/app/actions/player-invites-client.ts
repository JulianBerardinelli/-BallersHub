"use server";

import { db } from "@/lib/db";
import { playerInvites, playerProfiles, profileChangeLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

export async function acceptPlayerInvite(inviteId: string) {
  const supabase = await createSupabaseServerRSC();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user || !user.email) return { error: "No autorizado" };

  const invite = await db.query.playerInvites.findFirst({
    where: and(
      eq(playerInvites.id, inviteId),
      eq(playerInvites.playerEmail, user.email),
      eq(playerInvites.status, "pending")
    )
  });

  if (!invite) return { error: "Invitación de representación no encontrada o procesada" };

  try {
    await db.transaction(async (tx) => {
      // 1. Update invite status to accepted
      await tx.update(playerInvites)
        .set({ status: "accepted" })
        .where(eq(playerInvites.id, inviteId));

      // 2. Map PlayerProfile to the agency representation
      const pp = await tx.query.playerProfiles.findFirst({
        where: eq(playerProfiles.userId, user.id)
      });

      if (!pp) {
        throw new Error("El perfil del jugador no existe. Completa tu perfil primero.");
      }

      await tx.update(playerProfiles)
        .set({ agencyId: invite.agencyId })
        .where(eq(playerProfiles.id, pp.id));

      // 3. Keep track via change logs optionally
      await tx.insert(profileChangeLogs).values({
        playerId: pp.id,
        userId: user.id,
        field: "agency_id",
        oldValue: pp.agencyId ? pp.agencyId : null,
        newValue: invite.agencyId
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error accepting player representation invite", error);
    return { error: error instanceof Error ? error.message : "Error de servidor al aceptar la representación." };
  }
}

export async function rejectPlayerInvite(inviteId: string) {
  const supabase = await createSupabaseServerRSC();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user || !user.email) return { error: "No autorizado" };

  try {
    await db.update(playerInvites)
      .set({ status: "rejected" })
      .where(and(eq(playerInvites.id, inviteId), eq(playerInvites.playerEmail, user.email)));
    return { success: true };
  } catch (error) {
    console.error("Error rejecting player representation invite", error);
    return { error: "Error de servidor al rechazar." };
  }
}
