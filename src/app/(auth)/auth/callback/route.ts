// src/app/(auth)/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerRoute } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  // Some auth flows return error/error_description in the URL hash or query instead of code
  const errorDescription = url.searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(new URL(`/auth/sign-in?error=${encodeURIComponent(errorDescription)}`, url.origin));
  }

  let next = url.searchParams.get("redirect") || "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerRoute();
    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) {
      return NextResponse.redirect(new URL(`/auth/sign-in?error=${encodeURIComponent(exErr.message)}`, url.origin));
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_profiles").upsert({ user_id: user.id }); // role=member

      const [{ data: pp }, { data: rp }, { data: up }] = await Promise.all([
        supabase.from("player_profiles").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("reviewer_profiles").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle(),
      ]);

      const role = (up as any)?.role ?? "member";
      const hasAnyProfile = !!pp || !!rp;
      
      // If the user has no profile and role is member, they should go to onboarding
      // EXCEPT if they are explicitly being sent to update their password.
      if (!hasAnyProfile && role === "member" && !next.includes("/auth/update-password")) {
        next = "/onboarding/start";
      }
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
