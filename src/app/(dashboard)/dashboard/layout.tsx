import Image from "next/image";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";
import ClientDashboardSidebar, {
  ClientDashboardSidebarMobile,
} from "@/components/dashboard/client/Sidebar";
import { buildClientDashboardNavigation } from "./navigation";
import { fetchPlayerTaskMetrics } from "@/lib/dashboard/client/metrics";
import {
  evaluateDashboardTasks,
  pickHighestSeverity,
  type ClientTaskContext,
  type TaskEvaluation,
  type TaskSeverity,
} from "@/lib/dashboard/client/tasks";
import { hydrateTaskProfileSnapshot } from "@/lib/dashboard/client/profile-data";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { NotificationBootstrap } from "@/modules/notifications";
import type { ClientDashboardNavBadge } from "./navigation";
import {
  hasActiveApplication,
  isApplicationDraft,
  normalizeApplicationStatus,
} from "@/lib/dashboard/client/application-status";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard");

  const dashboardState = await fetchDashboardState(supabase, user.id);

  const profile = dashboardState.profile;
  const application = dashboardState.application;
  const subscription = dashboardState.subscription;
  const normalizedApplicationStatus = normalizeApplicationStatus(application?.status ?? null);

  const metrics = profile
    ? await fetchPlayerTaskMetrics(supabase, profile.id)
    : {
        careerItems: 0,
        media: { total: 0, photos: 0, videos: 0, docs: 0 },
        contactReferences: 0,
      };

  const normalizedProfile = profile
    ? {
        id: profile.id,
        status: profile.status,
        slug: profile.slug,
        visibility: profile.visibility,
        full_name: profile.full_name,
        birth_date: profile.birth_date,
        nationality: profile.nationality,
        positions: profile.positions,
        current_club: profile.current_club,
        bio: profile.bio,
        avatar_url: profile.avatar_url ?? dashboardState.primaryPhotoUrl ?? null,
        foot: profile.foot,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
      }
    : null;

  const hydratedProfile = hydrateTaskProfileSnapshot(normalizedProfile, application ?? null);

  const taskContext: ClientTaskContext = {
    profile: hydratedProfile,
    metrics,
  };

  const taskEvaluation = evaluateDashboardTasks(taskContext);
  const navigationBadges = buildNavigationBadges(taskEvaluation);
  const navigation = buildClientDashboardNavigation(navigationBadges);

  const userDisplayName =
    hydratedProfile?.full_name ??
    profile?.full_name ??
    application?.full_name ??
    user.email ??
    null;

  return (
    <>
      <NotificationBootstrap
        userName={userDisplayName}
        onboarding={
          application?.id
            ? {
                requestId: application.id,
                status: application.status ?? null,
                dashboardHref: "/dashboard",
              }
            : null
        }
      />
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <header className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Área del cliente</h1>
            <p className="text-sm text-neutral-400">
              Gestioná tu perfil profesional, personalizá tu plantilla y administrá tu cuenta.
            </p>
          </div>

        <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-950/60 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative size-16 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
                {hydratedProfile ? (
                  <Image
                    src={hydratedProfile.avatar_url ?? "/images/player-default.png"}
                    alt="Avatar del jugador"
                    fill
                    sizes="64px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-neutral-500">
                    Sin perfil
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  {hydratedProfile?.full_name ?? "Perfil sin configurar"}
                </p>
                <p className="text-xs text-neutral-500">
                  {hydratedProfile?.slug
                    ? `/${hydratedProfile.slug}`
                    : "Creá tu perfil para habilitar tu página pública."}
                </p>
              </div>
            </div>
            <div className="text-sm text-neutral-400">
              <p className="font-medium text-neutral-300">Sesión activa</p>
              <p>{user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hydratedProfile ? (
              <>
                <SummaryBadge>Perfil: {hydratedProfile.status}</SummaryBadge>
                <SummaryBadge>Visibilidad: {hydratedProfile.visibility}</SummaryBadge>
              </>
            ) : hasActiveApplication(normalizedApplicationStatus) ? (
              <SummaryBadge tone="warning">Tu solicitud está en revisión</SummaryBadge>
            ) : isApplicationDraft(normalizedApplicationStatus) ? (
              <SummaryBadge tone="warning">Retomá el onboarding para completar tu perfil</SummaryBadge>
            ) : (
              <SummaryBadge tone="warning">Aún no completaste tu perfil de jugador</SummaryBadge>
            )}
            <SummaryBadge>
              Plan: {(subscription?.plan ?? profile?.plan_public ?? "free").toUpperCase()}
            </SummaryBadge>
            {subscription ? (
              <SummaryBadge tone={subscription.status === "active" ? "success" : "warning"}>
                Estado plan: {subscription.status}
              </SummaryBadge>
            ) : null}
          </div>
        </div>
      </header>

      <ClientDashboardSidebarMobile sections={navigation} onSignOut={signOutAction} />

      <div className="space-y-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
        <aside className="hidden lg:col-span-4 xl:col-span-3 lg:block">
          <ClientDashboardSidebar sections={navigation} onSignOut={signOutAction} />
        </aside>
        <section className="col-span-12 space-y-6 lg:col-span-8 xl:col-span-9">{children}</section>
      </div>
      </div>
    </>
  );
}

type SummaryBadgeTone = "default" | "warning" | "success";

function SummaryBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: SummaryBadgeTone;
}) {
  const baseClasses = "rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide";
  const toneClasses: Record<SummaryBadgeTone, string> = {
    default: "border-neutral-700 bg-neutral-900 text-neutral-200",
    warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  };

  return <span className={`${baseClasses} ${toneClasses[tone]}`}>{children}</span>;
}

function buildNavigationBadges(
  evaluation: TaskEvaluation,
): Partial<Record<string, ClientDashboardNavBadge>> {
  const badges: Partial<Record<string, ClientDashboardNavBadge>> = {};

  for (const [sectionId, summary] of Object.entries(evaluation.sections)) {
    const severity = pickHighestSeverity(summary);
    if (!severity) continue;
    const count = summary.severityCounts[severity];
    if (count > 0) {
      badges[sectionId] = { count, severity };
    }
  }

  const severityOrder: TaskSeverity[] = ["danger", "warning", "secondary"];
  for (const severity of severityOrder) {
    const total = evaluation.totals[severity];
    if (total > 0) {
      badges.home = { count: total, severity };
      break;
    }
  }

  return badges;
}
