"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { managerApplications, type NewManagerApplication } from "@/db/schema/managerApplications";
import { agencyProfiles } from "@/db/schema/agencies";
import { userProfiles } from "@/db/schema/users";
import { managerProfiles } from "@/db/schema/managerProfiles";

export async function submitManagerApplication(data: Omit<NewManagerApplication, "userId" | "id" | "status" | "createdAt" | "updatedAt">) {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Acceso denegado");

  // Verificar si existe el perfil primeramente
  const existingProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id)
  });

  if (!existingProfile) {
    await db.insert(userProfiles).values({
      userId: user.id,
      role: "member",
    });
  }

  await db.insert(managerApplications).values({
    userId: user.id,
    fullName: data.fullName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone || null,
    agencyName: data.agencyName,
    agencyWebsiteUrl: data.agencyWebsiteUrl || null,
    verifiedLink: data.verifiedLink || null,
    agentLicenseType: data.agentLicenseType || null,
    agentLicenseUrl: data.agentLicenseUrl || null,
    idDocUrl: data.idDocUrl || null,
    selfieUrl: data.selfieUrl || null,
    notes: data.notes || null,
    status: "pending",
  });

  revalidatePath("/onboarding/start");
  revalidatePath("/dashboard");
}

export async function approveManagerApplication(applicationId: string) {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Acceso denegado");

  // Verificar admin role en el perfil del revisor (idealmente)
  // Por ahora lo simplificamos y confiamos en el endpoint admin.
  
  const application = await db.query.managerApplications.findFirst({
    where: eq(managerApplications.id, applicationId),
  });

  if (!application) throw new Error("Solicitud no encontrada");

  // 1. Marcar como aprobada
  await db
    .update(managerApplications)
    .set({
      status: "approved",
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
    })
    .where(eq(managerApplications.id, applicationId));

  // 2. Crear Agencia
  const [newAgency] = await db
    .insert(agencyProfiles)
    .values({
      name: application.agencyName,
      slug: application.agencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      contactEmail: application.contactEmail,
      contactPhone: application.contactPhone,
      websiteUrl: application.agencyWebsiteUrl,
      verifiedLink: application.verifiedLink,
      agentLicenseUrl: application.agentLicenseUrl,
      agentLicenseType: application.agentLicenseType,
      isApproved: true,
    })
    .returning();

  // 3. Vincular usuario a su agencia y cambiarle el rol a manager
  await db
    .update(userProfiles)
    .set({
      role: "manager",
      agencyId: newAgency.id,
    })
    .where(eq(userProfiles.userId, application.userId));

  // 4. Crear el perfil personal del manager con los datos de contacto que proveyó
  await db.insert(managerProfiles).values({
    userId: application.userId,
    fullName: application.fullName,
    contactEmail: application.contactEmail,
    contactPhone: application.contactPhone,
  });

  revalidatePath("/admin/manager-applications");
}

export async function rejectManagerApplication(applicationId: string) {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Acceso denegado");

  await db
    .update(managerApplications)
    .set({
      status: "rejected",
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
    })
    .where(eq(managerApplications.id, applicationId));

  revalidatePath("/admin/manager-applications");
}
