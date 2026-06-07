// Auth + state gate for the manager onboarding flow.
// Mirrors the gate that /onboarding/player/apply/page.tsx already has:
//   - not logged in       → /auth/sign-in?redirect=<current>
//   - already approved    → /dashboard
//   - application pending → /dashboard (single source of truth)
// Sub-pages stay as client components for the form UX.

import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ManagerOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?redirect=/onboarding/manager/info");
  }

  const { data: managerApp } = await supabase
    .from("manager_applications")
    .select("status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ status: string | null }>();

  if (managerApp?.status === "approved" || managerApp?.status === "pending") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
