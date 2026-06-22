import { notFound, redirect } from "next/navigation";

import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import { PlanAccessProvider } from "@/components/dashboard/plan/PlanAccessProvider";
import { NotificationProvider } from "@/modules/notifications";

import AdminCoachHeader from "./_components/AdminCoachHeader";
import EditCoachSectionNav from "./_components/EditCoachSectionNav";
import CoachFinalizeReviewBar from "./_components/CoachFinalizeReviewBar";

export const dynamic = "force-dynamic";

// Mirror of the player module's edit layout: admin-only gate + the TARGET
// coach's plan provided so the reused dashboard editors gate Pro/Free exactly as
// that coach would see, plus the shared nav (breadcrumb + tabs), header card and
// the sticky "Finalizar revisión" bar. NotificationProvider wraps the reused
// editors that enqueue in-editor toasts (CoachProfileEditor / CoachCareerManager).
export default async function AdminCoachEditLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/coaches");

  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: string | null }>();
  if (up?.role !== "admin") redirect("/admin/coaches");

  const admin = createSupabaseAdmin();
  const { data: coach } = await admin
    .from("coach_profiles")
    .select("id, user_id, slug, full_name, avatar_url, status")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      user_id: string;
      slug: string | null;
      full_name: string | null;
      avatar_url: string | null;
      status: string | null;
    }>();
  if (!coach) notFound();

  const { data: sub } = await admin
    .from("subscriptions")
    .select(
      "plan, status, status_v2, plan_id, processor, processor_subscription_id, current_period_end, trial_ends_at, cancel_at_period_end, canceled_at",
    )
    .eq("user_id", coach.user_id)
    .maybeSingle();

  const access = resolvePlanAccess(
    sub
      ? {
          plan: sub.plan ?? null,
          status: sub.status ?? null,
          statusV2: sub.status_v2 ?? null,
          planId: sub.plan_id ?? null,
          processor: sub.processor ?? null,
          processorSubscriptionId: sub.processor_subscription_id ?? null,
          currentPeriodEnd: sub.current_period_end ?? null,
          trialEndsAt: sub.trial_ends_at ?? null,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? null,
          canceledAt: sub.canceled_at ?? null,
        }
      : null,
  );

  const status = ["draft", "pending_review", "approved", "rejected"].includes(coach.status ?? "")
    ? (coach.status as string)
    : "approved";

  return (
    <PlanAccessProvider value={{ access, audience: "coach" }}>
      <NotificationProvider>
        <div className="space-y-6">
          <EditCoachSectionNav coachId={coach.id} coachName={coach.full_name ?? ""} />
          <AdminCoachHeader
            name={coach.full_name ?? ""}
            slug={coach.slug ?? ""}
            avatarUrl={coach.avatar_url}
            status={status}
            isPro={access.isPro}
          />
          <div>{children}</div>
          <CoachFinalizeReviewBar coachId={coach.id} />
        </div>
      </NotificationProvider>
    </PlanAccessProvider>
  );
}
