"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  agencyCountryProfiles,
  agencyProfiles,
  userProfiles,
} from "@/db/schema";

async function resolveManagerAgency() {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
  });

  if (!profile || profile.role !== "manager" || !profile.agencyId) {
    throw new Error("Solo un mánager activo puede editar el portfolio.");
  }

  return { user, agencyId: profile.agencyId };
}

const upsertSchema = z.object({
  countryCode: z.string().length(2).toUpperCase(),
  description: z.string().max(2000).nullable().optional(),
});

export async function upsertAgencyCountryProfileAction(payload: {
  countryCode: string;
  description: string | null;
}) {
  const { agencyId } = await resolveManagerAgency();
  const safe = upsertSchema.parse(payload);
  const cc = safe.countryCode.toUpperCase();
  const desc = safe.description?.trim() || null;

  const existing = await db.query.agencyCountryProfiles.findFirst({
    where: and(
      eq(agencyCountryProfiles.agencyId, agencyId),
      eq(agencyCountryProfiles.countryCode, cc),
    ),
  });

  if (existing) {
    await db
      .update(agencyCountryProfiles)
      .set({ description: desc, updatedAt: new Date() })
      .where(eq(agencyCountryProfiles.id, existing.id));
  } else {
    await db.insert(agencyCountryProfiles).values({
      agencyId,
      countryCode: cc,
      description: desc,
    });
  }

  const agency = await db.query.agencyProfiles.findFirst({
    where: eq(agencyProfiles.id, agencyId),
    columns: { slug: true },
  });

  revalidatePath("/dashboard/agency");
  if (agency?.slug) revalidatePath(`/agency/${agency.slug}`);

  return { success: true };
}

export async function deleteAgencyCountryProfileAction(countryCode: string) {
  const { agencyId } = await resolveManagerAgency();
  const cc = countryCode.toUpperCase();

  await db
    .delete(agencyCountryProfiles)
    .where(
      and(
        eq(agencyCountryProfiles.agencyId, agencyId),
        eq(agencyCountryProfiles.countryCode, cc),
      ),
    );

  const agency = await db.query.agencyProfiles.findFirst({
    where: eq(agencyProfiles.id, agencyId),
    columns: { slug: true },
  });

  revalidatePath("/dashboard/agency");
  if (agency?.slug) revalidatePath(`/agency/${agency.slug}`);

  return { success: true };
}
