import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import PlayerApplyFlow from "./ApplyFlow";
import {
  hasActiveApplication,
  isApplicationApproved,
  normalizeApplicationStatus,
} from "@/lib/dashboard/client/application-status";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";

export const dynamic = "force-dynamic";

export default async function PlayerApplyPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/onboarding/player/apply");

  const dashboardState = await fetchDashboardState(supabase, user.id);
  const profile = dashboardState.profile;
  const application = dashboardState.application;
  const applicationStatus = normalizeApplicationStatus(application?.status ?? null);

  if (profile || isApplicationApproved(applicationStatus)) {
    redirect("/dashboard");
  }

  if (hasActiveApplication(applicationStatus)) {
    redirect("/dashboard");
  }

  return <PlayerApplyFlow applicationId={application?.id ?? null} />;
}
