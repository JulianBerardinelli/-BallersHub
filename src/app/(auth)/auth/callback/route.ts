// app/(auth)/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  let next = url.searchParams.get("redirect") || "/dashboard";

  if (code) {
    const supabase = await createSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);

    // ensure user_profiles exists and decide next step
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_profiles")
        .upsert({ user_id: user.id })            // default role = 'member'

      const [{ data: pp }, { data: rp }, { data: up }] = await Promise.all([
        supabase.from("player_profiles").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("reviewer_profiles").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle(),
      ]);

      const role = up?.role ?? "member";
      const hasAnyProfile = !!pp || !!rp;

      if (!hasAnyProfile && role === "member") {
        next = "/onboarding/start";
      }
    }
  }
  return NextResponse.redirect(new URL(next, req.url));
}
