import Image from "next/image";
import Link from "next/link";
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
import PendingInvitesModal from "@/components/dashboard/client/PendingInvitesModal";
import PlayerPendingInvitesModal from "@/components/dashboard/client/PlayerPendingInvitesModal";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard");

  // Defensive: dashboard data fetch (Supabase + Drizzle) can fail when the
  // pooler hiccups or the project is paused. We wrap the whole data layer
  // in a try/catch so we render a degraded "data unavailable" shell instead
  // of crashing the entire dashboard layout — and locking the user out of
  // sign-out, settings, and any child page that doesn't itself need DB.
  let layoutData: DashboardLayoutData;
  try {
    layoutData = await loadDashboardLayoutData(supabase, user);
  } catch (err) {
    console.warn(
      "[DashboardLayout] data fetch failed, rendering fallback:",
      err instanceof Error ? err.message : err,
    );
    return <DashboardDegradedFallback userEmail={user.email ?? null} />;
  }

  const {
    up,
    managerApp,
    isManager,
    formattedInvites,
    formattedPlayerInvites,
    profile,
    application,
    subscription,
    normalizedApplicationStatus,
    metrics,
    dashboardState,
  } = layoutData;

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
  const navigation = buildClientDashboardNavigation(navigationBadges, isManager);

  const userDisplayName =
    hydratedProfile?.full_name ??
    profile?.full_name ??
    application?.full_name ??
    user.email ??
    null;

  return (
    <>
      <PendingInvitesModal invites={formattedInvites} />
      <PlayerPendingInvitesModal invites={formattedPlayerInvites} />
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
      <div className="mx-auto w-full max-w-[1200px] px-6 py-7">
        {/* Header — full-width, scrolls naturally */}
        <header className="space-y-5">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
              {isManager ? "Manager" : "Cliente"}
            </span>
            <h1 className="font-bh-display text-3xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
              {isManager ? (
                <>
                  Área de <span className="text-bh-blue">agencia</span>
                </>
              ) : (
                <>
                  Área del <span className="text-bh-lime">cliente</span>
                </>
              )}
            </h1>
            <p className="text-sm leading-[1.55] text-bh-fg-3">
              {isManager
                ? "Gestioná la representación de tus jugadores, permisos del staff y perfil institucional."
                : "Gestioná tu perfil profesional, personalizá tu plantilla y administrá tu cuenta."}
            </p>
          </div>

          {/* Profile card */}
          <div className="space-y-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-bh-md border border-white/[0.08] bg-bh-surface-2">
                  {isManager ? (
                    up?.agency?.logoUrl ? (
                      <img
                        src={up.agency.logoUrl}
                        alt="Logo de la agencia"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center font-bh-display text-sm font-bold uppercase text-bh-fg-3">
                        {(up?.agency?.name || managerApp?.agency_name || "Ag").slice(0, 2)}
                      </div>
                    )
                  ) : hydratedProfile ? (
                    <Image
                      src={hydratedProfile.avatar_url ?? "/images/player-default.png"}
                      alt="Avatar del jugador"
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[11px] text-bh-fg-4">
                      Sin perfil
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {isManager ? (
                    <>
                      <p className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                        {up?.agency?.name || managerApp?.agency_name || "Agencia en validación"}
                      </p>
                      <p className="font-bh-mono text-[11px] text-bh-fg-4">
                        {up?.agency?.slug
                          ? `/agency/${up.agency.slug}`
                          : "Configurá tu perfil para activar el enlace público"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                        {hydratedProfile?.full_name ?? "Perfil sin configurar"}
                      </p>
                      <p className="font-bh-mono text-[11px] text-bh-fg-4">
                        {hydratedProfile?.slug
                          ? `/${hydratedProfile.slug}`
                          : "Creá tu perfil para habilitar tu página pública."}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-bh-display text-[10px] font-bold uppercase tracking-[0.14em] text-bh-fg-4">
                  Sesión activa
                </p>
                <p className="font-bh-mono text-[12px] text-bh-fg-3">{user.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isManager && managerApp ? (
                <SummaryBadge tone={managerApp.status === "approved" ? "success" : "warning"}>
                  Manager: {managerApp.status === "approved" ? "Agencia Activa" : "En revisión"}
                </SummaryBadge>
              ) : hydratedProfile ? (
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

        {/* Mobile drawer */}
        <div className="mt-6 lg:hidden">
          <ClientDashboardSidebarMobile sections={navigation} onSignOut={signOutAction} />
        </div>

        {/* Floating sidebar + content */}
        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-[260px] lg:shrink-0">
            <div className="sticky top-24 hidden rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-3 lg:block">
              <ClientDashboardSidebar sections={navigation} onSignOut={signOutAction} />
            </div>
          </aside>
          <section className="min-w-0 flex-1 space-y-6">{children}</section>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------
// Data layer + degraded fallback
// ---------------------------------------------------------------

type DashboardUser = { id: string; email?: string | null };

type DashboardLayoutData = Awaited<ReturnType<typeof loadDashboardLayoutData>>;

async function loadDashboardLayoutData(
  supabase: Awaited<ReturnType<typeof createSupabaseServerRSC>>,
  user: DashboardUser,
) {
  const dashboardState = await fetchDashboardState(supabase, user.id);

  const { db } = await import("@/lib/db");
  const up = await db.query.userProfiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.userId, user.id),
    with: { agency: true },
  });
  const role = up?.role || "member";

  const { data: managerApp } = await supabase
    .from("manager_applications")
    .select("status, agency_name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isManager = role === "manager" || !!managerApp;

  const pendingStaffInvites = user.email
    ? await db.query.agencyInvites.findMany({
        where: (invites, { eq, and }) =>
          and(eq(invites.email, user.email!), eq(invites.status, "pending")),
        with: { agency: true },
      })
    : [];

  const formattedInvites = pendingStaffInvites.map((inv) => ({
    id: inv.id,
    agencyName: inv.agency?.name || "Agencia",
  }));

  const pendingPlayerInvites =
    user.email && !isManager
      ? await db.query.playerInvites.findMany({
          where: (invites, { eq, and }) =>
            and(
              eq(invites.playerEmail, user.email!),
              eq(invites.status, "pending"),
            ),
          with: { agency: true },
        })
      : [];

  const formattedPlayerInvites = pendingPlayerInvites.map((inv) => ({
    id: inv.id,
    agencyName: inv.agency?.name || "Agencia",
    contractEndDate: inv.contractEndDate ? String(inv.contractEndDate) : null,
  }));

  const profile = dashboardState.profile;
  const application = dashboardState.application;
  const subscription = dashboardState.subscription;
  const normalizedApplicationStatus = normalizeApplicationStatus(
    application?.status ?? null,
  );

  const metrics = profile
    ? await fetchPlayerTaskMetrics(supabase, profile.id)
    : {
        careerItems: 0,
        media: { total: 0, photos: 0, videos: 0, docs: 0 },
        contactReferences: 0,
      };

  return {
    up,
    managerApp,
    isManager,
    formattedInvites,
    formattedPlayerInvites,
    profile,
    application,
    subscription,
    normalizedApplicationStatus,
    metrics,
    dashboardState,
  };
}

function DashboardDegradedFallback({
  userEmail,
}: {
  userEmail: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="space-y-5 rounded-bh-lg border border-bh-warning/25 bg-bh-warning/5 p-6">
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-bh-pill border border-bh-warning/30 bg-bh-warning/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-bh-warning">
            Dashboard temporalmente no disponible
          </span>
          <h1 className="font-bh-display text-2xl font-bold uppercase leading-tight tracking-[-0.005em] text-bh-fg-1 md:text-3xl">
            No pudimos cargar tu información
          </h1>
          <p className="text-[13.5px] leading-[1.6] text-bh-fg-2">
            Estamos teniendo problemas para conectarnos con la base de datos.
            Suele resolverse en unos segundos. Si persiste, escribinos a{" "}
            <a
              href="mailto:soporte@ballershub.app"
              className="text-bh-lime underline-offset-4 hover:underline"
            >
              soporte@ballershub.app
            </a>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-bh-fg-3">
          <span>Sesión activa:</span>
          <span className="font-bh-mono text-bh-fg-2">
            {userEmail ?? "—"}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-bh-md bg-bh-lime px-5 py-2.5 text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 hover:-translate-y-px hover:bg-[#d8ff26]"
          >
            Reintentar
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-bh-md border border-white/[0.12] px-5 py-2.5 text-[13px] font-semibold text-bh-fg-2 transition-colors hover:bg-white/[0.06] hover:text-bh-fg-1"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
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
  const baseClasses =
    "inline-flex items-center rounded-bh-pill border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]";
  const toneClasses: Record<SummaryBadgeTone, string> = {
    default: "border-white/[0.12] bg-white/[0.06] text-bh-fg-2",
    warning: "border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.10)] text-bh-warning",
    success: "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.10)] text-bh-success",
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
