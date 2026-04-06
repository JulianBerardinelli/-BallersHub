"use server";

import { db } from "@/lib/db";
import { agencyInvites, userProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

export async function acceptAgencyInvite(inviteId: string) {
  const supabase = await createSupabaseServerRSC();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user || !user.email) return { error: "No autorizado" };

  const invite = await db.query.agencyInvites.findFirst({
    where: and(
      eq(agencyInvites.id, inviteId),
      eq(agencyInvites.email, user.email),
      eq(agencyInvites.status, "pending")
    )
  });

  if (!invite) return { error: "Invitación no encontrada o procesada" };

  // Explicit safety check: A player cannot be converted to a manager
  const isPlayer = await db.query.playerProfiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.userId, user.id)
  });

  if (isPlayer) {
    return { error: "Tienes un perfil de jugador activo en la plataforma. Tu cuenta no puede cambiar de rol a Mánager de Agencia." };
  }

  try {
    await db.transaction(async (tx) => {
      // 1. Update invite status
      await tx.update(agencyInvites)
        .set({ status: "accepted" })
        .where(eq(agencyInvites.id, inviteId));

      // 2. Map userProfile exactly to manager logic
      const up = await tx.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, user.id)
      });

      if (!up) {
        await tx.insert(userProfiles).values({
          userId: user.id,
          role: "manager",
          agencyId: invite.agencyId
        });
      } else {
        await tx.update(userProfiles)
          .set({ role: "manager", agencyId: invite.agencyId })
          .where(eq(userProfiles.userId, user.id));
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error accepting invite", error);
    return { error: "Error de servidor al aceptar." };
  }
}

export async function rejectAgencyInvite(inviteId: string) {
  const supabase = await createSupabaseServerRSC();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user || !user.email) return { error: "No autorizado" };

  try {
    await db.update(agencyInvites)
      .set({ status: "rejected" })
      .where(and(eq(agencyInvites.id, inviteId), eq(agencyInvites.email, user.email)));
    return { success: true };
  } catch (error) {
    console.error("Error rejecting invite", error);
    return { error: "Error de servidor al rechazar." };
  }
}
