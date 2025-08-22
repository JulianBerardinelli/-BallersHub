// app/api/admin/_utils.ts
import { createSupabaseServerRoute } from "@/lib/supabase/server";

export async function requireAdminInRoute() {
  const supabase = await createSupabaseServerRoute();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401 as const, supabase, user: null };

  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (up?.role !== "admin") return { ok: false, status: 403 as const, supabase, user };
  return { ok: true as const, status: 200 as const, supabase, user };
}
