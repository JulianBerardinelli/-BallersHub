"use server";

import crypto from "crypto";
import { sendAgencyStaffInviteEmail } from "@/lib/resend";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencyInvites, userProfiles } from "@/db/schema";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";

const FREE_STAFF_CAP = 2;

export async function inviteAgencyStaff(email: string) {
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

  // Plan cap guard (Free Agency: 2 members incl. owner + pending invites).
  // Defense in depth — the client also blocks but we refuse here for
  // bypassed requests.
  const dashboardState = await fetchDashboardState(supabase, user.id);
  const planAccess = resolvePlanAccess(dashboardState.subscription);
  if (!planAccess.isPro) {
    const [staffResult, pendingInvitesResult] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(userProfiles)
        .where(eq(userProfiles.agencyId, userProfile.agencyId)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(agencyInvites)
        .where(
          and(
            eq(agencyInvites.agencyId, userProfile.agencyId),
            eq(agencyInvites.status, "pending"),
          ),
        ),
    ]);
    const totalSlots =
      (staffResult[0]?.count ?? 0) + (pendingInvitesResult[0]?.count ?? 0);
    if (totalSlots >= FREE_STAFF_CAP) {
      return {
        error: `Llegaste al límite de ${FREE_STAFF_CAP} members del plan Free Agency. Activá Pro para sumar más.`,
      };
    }
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Edge Checks: Is the target email already a registered user?
  // We use the postgres superuser connection in Drizzle to check auth.users securely.
  try {
    const authResult = await db.execute(
      sql`SELECT id FROM auth.users WHERE email = ${normalizedEmail} LIMIT 1`
    );
    
    if (authResult.length > 0) {
      const targetUserId = authResult[0].id as string;
      const targetProfile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, targetUserId),
      });

      const targetPlayerProfile = await db.query.playerProfiles.findFirst({
        where: (profiles, { eq }) => eq(profiles.userId, targetUserId),
      });

      if (targetPlayerProfile) {
        return { error: "Este correo electrónico pertenece a un usuario que ya tiene un perfil público de jugador activo. Un jugador no puede ser mánager." };
      }

      if (targetProfile) {
        if (targetProfile.role === "manager" && targetProfile.agencyId !== userProfile.agencyId) {
          return { error: "Este usuario ya pertenece como manager a otra agencia." };
        }
      }
    }
  } catch (error) {
    console.warn("Could not query auth schema, ignoring edge case check:", error);
  }

  // 2. Check if an invite already exists for this email
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

  // 3. Insert the invite
  try {
    const token = crypto.randomUUID();
    const newInvite = await db.insert(agencyInvites).values({
      agencyId: userProfile.agencyId,
      email: normalizedEmail,
      invitedByUserId: userProfile.id,
      token,
      role: "manager", // Default staff role
      status: "pending"
    }).returning();

    // 4. Send Email via Resend
    const managerName = user.user_metadata?.full_name || "el equipo de dirección";
    await sendAgencyStaffInviteEmail(
      normalizedEmail, 
      managerName, 
      userProfile.agency.name, 
      token
    );

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
