import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import { PlanAccessProvider } from "@/components/dashboard/plan/PlanAccessProvider";
import { NotificationProvider } from "@/modules/notifications";
import CoachProfileEditor from "@/app/[locale]/(dashboard)/dashboard/coach/edit/CoachProfileEditor";
import { adminUpdateCoachProfileFields } from "@/app/actions/admin-coach";
import AdminCoachStatusCard from "./AdminCoachStatusCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar entrenador - Ballers Hub" };

export default async function AdminCoachEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/sign-in?redirect=/admin/coaches/${id}/edit`);
  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  const admin = createSupabaseAdmin();
  const { data: coach } = await admin
    .from("coach_profiles")
    .select(
      "id, user_id, slug, full_name, status, visibility, avatar_url, hero_url, role_title, bio, playing_style, methodology_analysis, career_objectives, preferred_formations, theme_primary_color, theme_accent_color, theme_background_color",
    )
    .eq("id", id)
    .maybeSingle();
  if (!coach) notFound();

  const { data: sub } = await admin
    .from("subscriptions")
    .select(
      "plan, status, status_v2, plan_id, processor, processor_subscription_id, current_period_end, trial_ends_at, cancel_at_period_end, canceled_at",
    )
    .eq("user_id", coach.user_id as string)
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

  const status = (["draft", "pending_review", "approved", "rejected"].includes(coach.status ?? "")
    ? coach.status
    : "approved") as "draft" | "pending_review" | "approved" | "rejected";
  const visibility = coach.visibility === "private" ? "private" : "public";

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/coaches" className="text-[12px] text-bh-fg-3 hover:text-bh-fg-1">
            ← Directorio de entrenadores
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">{coach.full_name as string}</h1>
        </div>
        {coach.slug && (
          <a
            href={`/coach/${coach.slug as string}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-bh-pill border border-white/[0.12] px-3 py-1.5 text-[12px] text-bh-fg-2 hover:border-white/[0.24]"
          >
            Ver perfil público ↗
          </a>
        )}
      </div>

      <AdminCoachStatusCard coachId={id} status={status} visibility={visibility} />

      {/* Reuse of the dashboard editor (same UI), with admin service-role action +
          admin image endpoint injected — identical to how the player admin reuses
          its dashboard components. */}
      <PlanAccessProvider value={{ access, audience: "coach" }}>
        <NotificationProvider>
          <CoachProfileEditor
            initial={{
              fullName: coach.full_name as string,
              avatarUrl: (coach.avatar_url as string | null) ?? null,
              heroUrl: (coach.hero_url as string | null) ?? null,
              roleTitle: (coach.role_title as string | null) ?? null,
              bio: (coach.bio as string | null) ?? null,
              careerObjectives: (coach.career_objectives as string | null) ?? null,
              playingStyle: (coach.playing_style as string | null) ?? null,
              methodologyAnalysis: (coach.methodology_analysis as string | null) ?? null,
              preferredFormations: Array.isArray(coach.preferred_formations)
                ? (coach.preferred_formations as string[])
                : [],
              theme: {
                primaryColor: (coach.theme_primary_color as string | null) ?? null,
                accentColor: (coach.theme_accent_color as string | null) ?? null,
                backgroundColor: (coach.theme_background_color as string | null) ?? null,
              },
            }}
            action={adminUpdateCoachProfileFields.bind(null, id)}
            imageUploadUrl={`/api/admin/coaches/${id}/profile-image/upload`}
          />
        </NotificationProvider>
      </PlanAccessProvider>
    </main>
  );
}
