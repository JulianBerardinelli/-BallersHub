"use server";

import { db } from "@/lib/db";
import { agencyInvites, userProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

export async function inviteAgencyStaff(email: string) {
  const supabase = await createSupabaseServerRSC();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "No autorizado" };
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
  });

  if (!userProfile?.agencyId || userProfile.role !== "manager") {
    return { error: "No tienes permisos para gestionar personal de esta agencia" };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if an invite already exists for this email and agency
  const existingInvite = await db.query.agencyInvites.findFirst({
    where: and(
      eq(agencyInvites.agencyId, userProfile.agencyId),
      eq(agencyInvites.email, normalizedEmail),
      eq(agencyInvites.status, "pending")
    )
  });

  if (existingInvite) {
    return { error: "Ya existe una invitación pendiente para este correo electrónico" };
  }

  // 2. Insert the invite
  try {
    const newInvite = await db.insert(agencyInvites).values({
      agencyId: userProfile.agencyId,
      email: normalizedEmail,
      invitedByUserId: userProfile.id,
      status: "pending"
    }).returning();

    return { success: true, invite: newInvite[0] };
  } catch (error) {
    console.error("Error creating agency invite:", error);
    return { error: "Ocurrió un error al enviar la invitación. Inténtalo más tarde." };
  }
}

export async function getPendingInvitesForAgency() {
  const supabase = await createSupabaseServerRSC();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "No autorizado" };
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
  });

  if (!userProfile?.agencyId || userProfile.role !== "manager") {
    return { error: "No tienes permisos" };
  }

  try {
    const invites = await db.query.agencyInvites.findMany({
      where: and(
        eq(agencyInvites.agencyId, userProfile.agencyId),
        eq(agencyInvites.status, "pending")
      ),
      orderBy: (invites, { desc }) => [desc(invites.createdAt)],
    });

    return { success: true, invites };
  } catch (error) {
    console.error("Error fetching agency invites:", error);
    return { error: "Error al cargar las invitaciones" };
  }
}

export async function revokeInvite(inviteId: string) {
  const supabase = await createSupabaseServerRSC();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "No autorizado" };
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
  });

  if (!userProfile?.agencyId || userProfile.role !== "manager") {
    return { error: "No tienes permisos" };
  }

  try {
    // Only allow revoking if the invite belongs to the same agency
    await db.delete(agencyInvites)
      .where(and(
        eq(agencyInvites.id, inviteId),
        eq(agencyInvites.agencyId, userProfile.agencyId)
      ));

    return { success: true };
  } catch (error) {
    console.error("Error revoking agency invite:", error);
    return { error: "Error al revocar la invitación" };
  }
}
