"use server";

import { createSupabaseServerRoute } from "@/lib/supabase/server";

export async function signOutAction() {
  const supa = await createSupabaseServerRoute();
  await supa.auth.signOut();
}
