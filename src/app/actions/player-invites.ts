"use server";

import crypto from "crypto";
import { sendPlayerAgencyInviteEmail } from "@/lib/resend";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { playerInvites, userProfiles, playerProfiles } from "@/db/schema";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";

const FREE_PLAYER_CAP = 5;

export async function invitePlayerToAgency(email: string, contractEndDate: string) {
  const supabase = await createSupabaseServerRSC();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "No autorizado" };
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
    with: { agency: true }
  });

  if (!userProfile?.agencyId || userProfile.role !== "manager" || !userProfile.agency) {
    return { error: "No tienes permisos para gestionar personal de esta agencia" };
  }

  // Plan cap guard (Free Agency: 5 players incl. pending invites).
  // Defense in depth — the client also blocks but we refuse here for
  // bypassed requests.
  const dashboardState = await fetchDashboardState(supabase, user.id);
  const planAccess = resolvePlanAccess(dashboardState.subscription);
  if (!planAccess.isPro) {
    const [playersResult, pendingInvitesResult] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(playerProfiles)
        .where(eq(playerProfiles.agencyId, userProfile.agencyId)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(playerInvites)
        .where(
          and(
            eq(playerInvites.agencyId, userProfile.agencyId),
            eq(playerInvites.status, "pending"),
          ),
        ),
    ]);
    const totalSlots =
      (playersResult[0]?.count ?? 0) + (pendingInvitesResult[0]?.count ?? 0);
    if (totalSlots >= FREE_PLAYER_CAP) {
      return {
        error: `Llegaste al límite de ${FREE_PLAYER_CAP} jugadores del plan Free Agency. Activá Pro para sumar más.`,
      };
    }
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Edge Checks: Is the target email already a registered *manager*?
  try {
    const authResult = await db.execute(
      sql`SELECT id FROM auth.users WHERE email = ${normalizedEmail} LIMIT 1`
    );
    
    if (authResult.length > 0) {
      const targetUserId = authResult[0].id as string;
      const targetProfile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, targetUserId),
      });

      if (targetProfile) {
        if (targetProfile.role === "manager") {
          return { error: "Este correo electrónico pertenece a un mánager. Los managers no pueden ser vinculados como jugadores." };
        }
      }
    }
  } catch (error) {
    console.warn("Could not query auth schema, ignoring edge case check:", error);
  }

  // 2. Check if a player invite already exists for this email
  const existingInvite = await db.query.playerInvites.findFirst({
    where: and(
      eq(playerInvites.agencyId, userProfile.agencyId),
      eq(playerInvites.playerEmail, normalizedEmail),
      eq(playerInvites.status, "pending")
    )
  });

  if (existingInvite) {
    return { error: "Ya existe una invitación pendiente para este jugador." };
  }

  // 3. Insert the invite
  try {
    const token = crypto.randomUUID();
    const newInvite = await db.insert(playerInvites).values({
      agencyId: userProfile.agencyId,
      playerEmail: normalizedEmail,
      invitedByUserId: userProfile.id,
      token,
      contractEndDate: contractEndDate,
      status: "pending"
    }).returning();

    // 4. Send Email via Resend
    const managerName = user.user_metadata?.full_name || "su equipo de dirección";
    await sendPlayerAgencyInviteEmail(
      normalizedEmail, 
      managerName, 
      userProfile.agency.name, 
      token,
      contractEndDate
    );

    return { success: true, invite: newInvite[0] };
  } catch (error) {
    console.error("Error creating player invite:", error);
    return { error: "Ocurrió un error al enviar la invitación. Inténtalo más tarde." };
  }
}

export async function revokePlayerInvite(inviteId: string) {
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
    await db.delete(playerInvites)
      .where(and(
        eq(playerInvites.id, inviteId),
        eq(playerInvites.agencyId, userProfile.agencyId)
      ));

    return { success: true };
  } catch (error) {
    console.error("Error revoking player invite:", error);
    return { error: "Error al revocar la invitación" };
  }
}

export async function getPendingPlayerInvitesForAgency() {
  const supabase = await createSupabaseServerRSC();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "No autorizado" };
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
  });

  if (!userProfile?.agencyId || userProfile.role !== "manager") {
    return { error: "No autorizado" };
  }

  try {
    const invites = await db.query.playerInvites.findMany({
      where: and(
        eq(playerInvites.agencyId, userProfile.agencyId),
        eq(playerInvites.status, "pending")
      ),
      orderBy: (invites, { desc }) => [desc(invites.createdAt)],
    });

    return { success: true, invites };
  } catch (error) {
    console.error("Error fetching player invites:", error);
    return { error: "Error al cargar las invitaciones de jugadores" };
  }
}
