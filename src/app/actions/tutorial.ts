"use server";

// Tutorial Assistant — server actions for user-driven UX events.
//
// Step completion is auto-detected from the profile state and never
// persisted, so this surface only handles `dismissed_at` and an explicit
// "resume" flow that clears the dismiss timestamp.

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { userTutorialProgress } from "@/db/schema";

export async function dismissTutorial(): Promise<{ ok: boolean }> {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await db
    .insert(userTutorialProgress)
    .values({
      userId: user.id,
      audience: "player", // safe default; bootstrap sets the real value
      planAtStart: "free",
      dismissedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userTutorialProgress.userId,
      set: { dismissedAt: new Date(), updatedAt: new Date() },
    });

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function resumeTutorial(): Promise<{ ok: boolean }> {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await db
    .update(userTutorialProgress)
    .set({ dismissedAt: null, updatedAt: new Date() })
    .where(eq(userTutorialProgress.userId, user.id));

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
