"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { marketingDripConfigs } from "@/db/schema";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

const ADMIN_PATH = "/admin/marketing/drips";

async function ensureAdmin() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/marketing/drips");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: string }>();

  if (profile?.role !== "admin") redirect("/dashboard");
}

const toggleSchema = z.object({
  dripId: z.string().uuid(),
  isActive: z.boolean(),
});

export async function toggleDripActive(input: z.infer<typeof toggleSchema>) {
  await ensureAdmin();
  const parsed = toggleSchema.parse(input);

  await db
    .update(marketingDripConfigs)
    .set({ isActive: parsed.isActive, updatedAt: new Date() })
    .where(eq(marketingDripConfigs.id, parsed.dripId));

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}
