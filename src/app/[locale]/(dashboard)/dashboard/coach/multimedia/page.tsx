import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import { isHeadCoachLayout, isStaffRole } from "@/lib/staff/roles";
import CoachMediaManager, { type CoachMediaItem } from "./CoachMediaManager";

export const dynamic = "force-dynamic";

export default async function CoachMultimediaPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/dashboard/coach/multimedia");

  const { data: profile } = await supabase
    .from("coach_profiles")
    .select("id, full_name, hero_url, model_url_1, primary_role")
    .eq("user_id", user.id)
    .maybeSingle<{
      id: string;
      full_name: string;
      hero_url: string | null;
      model_url_1: string | null;
      primary_role: string | null;
    }>();

  if (!profile) {
    return (
      <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-3">
        Tu perfil de entrenador todavía no está activo. Cuando el equipo apruebe tu solicitud vas a
        poder subir fotos y videos desde acá.
      </div>
    );
  }

  const { data: rows } = await supabase
    .from("coach_media")
    .select("id, type, url, title, status, rejection_reason, season_year, provider")
    .eq("coach_id", profile.id)
    .order("created_at", { ascending: false });

  const items: CoachMediaItem[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    type: (r.type as "photo" | "video" | "doc") ?? "photo",
    url: (r.url as string) ?? "",
    title: (r.title as string | null) ?? null,
    status: (r.status as "pending" | "approved" | "rejected") ?? "pending",
    rejectionReason: (r.rejection_reason as string | null) ?? null,
    seasonYear: (r.season_year as number | null) ?? null,
    provider: (r.provider as string | null) ?? null,
  }));

  // Plan → límites de media (Pro = 5 fotos + videos ilimitados; Free = 1 + 2).
  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      "plan, status, status_v2, plan_id, processor, processor_subscription_id, current_period_end, trial_ends_at, cancel_at_period_end, canceled_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  const isPro = resolvePlanAccess(
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
  ).isPro;

  // El 2º asset (model1) sólo aplica a perfiles con layout DT (montan Ideas de
  // Juego). primary_role null/legacy → mostrar (showTactical=true por defecto).
  const showModelAsset =
    profile.primary_role == null ||
    (isStaffRole(profile.primary_role) && isHeadCoachLayout(profile.primary_role));

  return (
    <CoachMediaManager
      items={items}
      isPro={isPro}
      heroUrl={profile.hero_url}
      modelUrl1={profile.model_url_1}
      showModelAsset={showModelAsset}
    />
  );
}
