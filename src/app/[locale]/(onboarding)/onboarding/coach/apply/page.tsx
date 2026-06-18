import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import {
  hasActiveApplication,
  isApplicationApproved,
  normalizeApplicationStatus,
} from "@/lib/dashboard/client/application-status";
import CoachApplyFlow from "./CoachApplyFlow";

export const dynamic = "force-dynamic";

export default async function CoachApplyPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/onboarding/coach/apply");

  // Coach gate — espejo del jugador pero contra las tablas del DT. No hay un
  // `coach_dashboard_state` todavía, así que leemos coach_profiles +
  // coach_applications directamente con el cliente RSC de Supabase.
  const [{ data: profile }, { data: application }] = await Promise.all([
    supabase
      .from("coach_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle<{ id: string }>(),
    supabase
      .from("coach_applications")
      .select("id, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; status: string | null }>(),
  ]);

  const applicationStatus = normalizeApplicationStatus(application?.status ?? null);

  if (profile || isApplicationApproved(applicationStatus)) {
    redirect("/dashboard");
  }

  if (hasActiveApplication(applicationStatus)) {
    redirect("/dashboard");
  }

  return <CoachApplyFlow userEmail={user.email ?? null} />;
}
