"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { agencyProfiles } from "@/db/schema/agencies";
import { userProfiles } from "@/db/schema/users";

export async function getAgencyDetails(agencyId: string) {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Acceso denegado"); // Optional: adjust permissions

  const agency = await db.query.agencyProfiles.findFirst({
    where: eq(agencyProfiles.id, agencyId),
  });

  return agency;
}

export async function getActiveAgencies() {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Acceso denegado"); 

  const agencies = await db.query.agencyProfiles.findMany({
    where: eq(agencyProfiles.isApproved, true),
    columns: { id: true, name: true, logoUrl: true },
    orderBy: (agencies, { asc }) => [asc(agencies.name)],
  });

  return agencies;
}

import { z } from "zod";

const updateAgencySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(100).optional(),
  logoUrl: z.string().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  verifiedLink: z.string().nullable().optional(),
  agentLicenseUrl: z.string().nullable().optional(),
  agentLicenseType: z.string().max(100).nullable().optional(),
  licenses: z.array(z.object({
    type: z.string().min(1).max(50),
    number: z.string().min(1).max(100),
    url: z.string().optional()
  })).max(10).nullable().optional(),
  operativeCountries: z.array(z.string().length(2)).max(15).nullable().optional(),
  headquarters: z.string().max(100).nullable().optional(),
  foundationYear: z.number().int().min(1800).max(new Date().getFullYear()).nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  twitterUrl: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  services: z.array(z.string().max(60)).max(20).nullable().optional(),
});

export async function updateAgencyProfile(agencyId: string, data: Partial<typeof agencyProfiles.$inferInsert>) {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Acceso denegado");

  // Verify that this user belongs to the agency they are trying to edit
  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
  });

  if (!userProfile || userProfile.agencyId !== agencyId) {
    throw new Error("No tienes permisos para editar esta agencia");
  }

  const safeData = updateAgencySchema.parse(data);

  await db
    .update(agencyProfiles)
    .set({
      ...safeData,
      updatedAt: new Date(),
    })
    .where(eq(agencyProfiles.id, agencyId));

  revalidatePath("/dashboard/agency");
  revalidatePath("/dashboard");
}
