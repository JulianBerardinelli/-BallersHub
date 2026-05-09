"use server";

import { eq, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  agencyMedia,
  agencyProfiles,
  userProfiles,
} from "@/db/schema";
import { AGENCY_MEDIA_MAX, AGENCY_MEDIA_BUCKET } from "./agency-media-constants";

const BUCKET = AGENCY_MEDIA_BUCKET;

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
    throw new Error("Solo un mánager activo puede gestionar la galería.");
  }

  return { supabase, user, agencyId: profile.agencyId };
}

const addSchema = z.object({
  url: z.string().url(),
  title: z.string().max(120).nullable().optional(),
  altText: z.string().max(160).nullable().optional(),
});

export async function addAgencyMediaAction(payload: {
  url: string;
  title?: string | null;
  altText?: string | null;
}) {
  const { agencyId } = await resolveManagerAgency();
  const safe = addSchema.parse(payload);

  const existing = await db.query.agencyMedia.findMany({
    where: eq(agencyMedia.agencyId, agencyId),
  });
  if (existing.length >= AGENCY_MEDIA_MAX) {
    throw new Error(`La galería admite hasta ${AGENCY_MEDIA_MAX} imágenes.`);
  }

  const nextPosition = existing.length;

  const inserted = await db
    .insert(agencyMedia)
    .values({
      agencyId,
      url: safe.url,
      title: safe.title ?? null,
      altText: safe.altText ?? null,
      position: nextPosition,
    })
    .returning();

  const agency = await db.query.agencyProfiles.findFirst({
    where: eq(agencyProfiles.id, agencyId),
    columns: { slug: true },
  });

  revalidatePath("/dashboard/agency");
  if (agency?.slug) revalidatePath(`/agency/${agency.slug}`);

  return { success: true, item: inserted[0] };
}

export async function deleteAgencyMediaAction(mediaId: string) {
  const { supabase, agencyId } = await resolveManagerAgency();

  const item = await db.query.agencyMedia.findFirst({
    where: and(eq(agencyMedia.id, mediaId), eq(agencyMedia.agencyId, agencyId)),
  });

  if (!item) throw new Error("Imagen no encontrada.");

  // Best-effort: remove the underlying object from storage if it's hosted in
  // our bucket. If it's an external URL we just drop the record.
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  if (item.url.includes(marker)) {
    const path = item.url.split(marker)[1];
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]);
    }
  }

  await db.delete(agencyMedia).where(eq(agencyMedia.id, mediaId));

  // Re-pack positions so they stay sequential.
  const remaining = await db.query.agencyMedia.findMany({
    where: eq(agencyMedia.agencyId, agencyId),
    orderBy: asc(agencyMedia.position),
  });
  await Promise.all(
    remaining.map((row, idx) =>
      db
        .update(agencyMedia)
        .set({ position: idx })
        .where(eq(agencyMedia.id, row.id)),
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

export async function listAgencyMediaAction() {
  const { agencyId } = await resolveManagerAgency();

  const rows = await db.query.agencyMedia.findMany({
    where: eq(agencyMedia.agencyId, agencyId),
    orderBy: asc(agencyMedia.position),
  });

  return rows;
}
