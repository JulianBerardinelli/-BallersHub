import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";
import ClientDashboardSidebar from "@/components/dashboard/client/Sidebar";
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
import {
  ADMIN_EDIT_DOMAIN_HREFS,
  isAdminEditDomain,
  type AdminEditDomain,
} from "@/lib/admin/edit-domains";
import {
  COACH_ADMIN_EDIT_DOMAIN_HREFS,
  COACH_ADMIN_EDIT_DOMAIN_LABELS,
  isCoachAdminEditDomain,
  type CoachAdminEditDomain,
} from "@/lib/admin/coach-edit-sections";
import type { ClientDashboardNavBadge } from "./navigation";
import {
  hasActiveApplication,
  isApplicationDraft,
  normalizeApplicationStatus,
} from "@/lib/dashboard/client/application-status";
import PendingInvitesModal from "@/components/dashboard/client/PendingInvitesModal";
import PlayerPendingInvitesModal from "@/components/dashboard/client/PlayerPendingInvitesModal";
import { PlanAccessProvider } from "@/components/dashboard/plan/PlanAccessProvider";
import SubscriptionStateBanner from "@/components/dashboard/plan/SubscriptionStateBanner";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import { TutorialProvider } from "@/components/tutorial/TutorialProvider";
import TutorialDock from "@/components/tutorial/TutorialDock";
import { bootstrapTutorialState } from "@/lib/tutorial/bootstrap";
import { DashboardDock } from "@/components/layout/mobile-nav";
import CoachDashboardShell from "./CoachDashboardShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard");

  // Coach early-branch — isolated. Approved coaches (role='coach') and members
  // with a coach_application render a dedicated coach shell; the player/agency
  // code path below is left completely unchanged (zero regression surface).
  try {
    const coachShell = await loadCoachShellData(supabase, user);
    if (coachShell) {
      return (
        <CoachDashboardShell
          userEmail={user.email ?? null}
          profile={coachShell.profile}
          application={coachShell.application}
          subscription={coachShell.subscription}
          adminEdits={coachShell.adminEdits}
        >
          {children}
        </CoachDashboardShell>
      );
    }
  } catch (err) {
    console.warn(
      "[DashboardLayout] coach shell check failed, falling through:",
      err instanceof Error ? err.message : err,
    );
  }

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
    adminEdits,
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

  const t = await getTranslations("dashboard");

  const taskEvaluation = evaluateDashboardTasks(taskContext);
  const navigationBadges = buildNavigationBadges(taskEvaluation);
  const navigation = buildClientDashboardNavigation(navigationBadges, isManager, t);

  const userDisplayName =
    hydratedProfile?.full_name ??
    profile?.full_name ??
    application?.full_name ??
    user.email ??
    null;

  const planAccess = resolvePlanAccess(subscription ?? null);
  const audience = isManager ? "agency" : "player";

  // Tutorial bootstrap. Non-fatal: if it fails we just don't render the dock.
  //
  // Gate: only show the tutorial to users with a *professional account*
  // already created — player_profile (application approved) OR confirmed
  // manager. A brand-new signup with no application yet (or one still
  // pending review) should NOT see player/agency tasks: their role hasn't
  // been decided yet, so we have nothing to guide them on. The onboarding
  // flow drives those users instead.
  const hasProfessionalAccount = Boolean(profile) || isManager;

  let tutorialState = null;
  if (hasProfessionalAccount) {
    try {
      tutorialState = await bootstrapTutorialState({
        userId: user.id,
        audience,
        tier: planAccess.isPro ? "pro" : "free",
      });
    } catch (err) {
      console.warn(
        "[DashboardLayout] tutorial bootstrap failed (non-fatal):",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return (
    <PlanAccessProvider value={{ access: planAccess, audience }}>
      <TutorialProvider state={tutorialState}>
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
        adminEdits={adminEdits}
      />
      <div className="mx-auto w-full max-w-[1200px] px-6 py-7 max-lg:pb-32">
        {/* Header — full-width, scrolls naturally */}
        <header className="space-y-5">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
              {isManager ? t("shell.roleManager") : t("shell.roleClient")}
            </span>
            <h1 className="font-bh-display text-3xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
              {isManager
                ? t.rich("shell.headingManager", {
                    hl: (c) => <span className="text-bh-blue">{c}</span>,
                  })
                : t.rich("shell.headingClient", {
                    hl: (c) => <span className="text-bh-lime">{c}</span>,
                  })}
            </h1>
            <p className="text-sm leading-[1.55] text-bh-fg-3">
              {isManager ? t("shell.subtitleManager") : t("shell.subtitleClient")}
            </p>
          </div>

          {/* Profile card */}
          <div className="space-y-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-bh-md border border-white/[0.08] bg-bh-surface-2">
                  {isManager ? (
                    up?.agency?.logoUrl ? (
                      <Image
                        src={up.agency.logoUrl}
                        alt="Logo de la agencia"
                        fill
                        sizes="64px"
                        className="object-contain"
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
                  {t("shell.activeSession")}
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

        {/* Subscription state — trial countdown, past_due, expired, etc */}
        <div className="mt-5 space-y-3">
          <SubscriptionStateBanner
            access={planAccess}
            rawSubscription={
              subscription
                ? {
                    plan: subscription.plan,
                    statusV2: subscription.statusV2,
                    currentPeriodEnd: subscription.currentPeriodEnd,
                  }
                : null
            }
          />
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

      {/* Floating bottom dock (lg:hidden, portaled). Players: Panel · Perfil ·
          Plantilla · Ajustes. Managers: Panel · Agencia · Gestión · Plantilla ·
          Ajustes. Tabs built from `navigation` by buildDashboardGroups(). */}
      <DashboardDock
        sections={navigation}
        isPro={planAccess.isPro}
        onSignOut={signOutAction}
      />

      <TutorialDock />
      </TutorialProvider>
    </PlanAccessProvider>
  );
}

// ---------------------------------------------------------------
// Data layer + degraded fallback
// ---------------------------------------------------------------

type DashboardUser = { id: string; email?: string | null };

type DashboardLayoutData = Awaited<ReturnType<typeof loadDashboardLayoutData>>;

// Coach shell data loader (PR-4a). Returns null for non-coach users so the
// existing player/agency path proceeds untouched.
async function loadCoachShellData(
  supabase: Awaited<ReturnType<typeof createSupabaseServerRSC>>,
  user: DashboardUser,
) {
  const { db } = await import("@/lib/db");
  const up = await db.query.userProfiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.userId, user.id),
  });
  const role = up?.role || "member";
  // Only coaches (approved) and members (possible pending coach) can match.
  if (role !== "coach" && role !== "member") return null;

  const { data: application } = await supabase
    .from("coach_applications")
    .select("id, status, rejection_reason")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // A plain member with no coach application is a brand-new / player user —
  // leave them on the existing path.
  if (role !== "coach" && !application) return null;

  const { data: profile } = await supabase
    .from("coach_profiles")
    .select("slug, full_name, avatar_url, status, visibility")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      "plan, status, status_v2, plan_id, processor, processor_subscription_id, current_period_end, trial_ends_at, cancel_at_period_end, canceled_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  // Unread "staff corrected your coach profile" notifications → on-login toast.
  // Mirrors the player path; the isolated coach kind keeps the two separate.
  const adminEditRows = await db.query.notifications.findMany({
    where: (n, { and, eq, isNull }) =>
      and(
        eq(n.recipientUserId, user.id),
        eq(n.kind, "admin.coachProfileCorrected"),
        isNull(n.readAt),
      ),
    orderBy: (n, { desc }) => desc(n.createdAt),
    limit: 10,
  });
  const adminEdits = adminEditRows.map((n) => {
    const payload = (n.payload ?? {}) as { domain?: string; note?: unknown };
    const domain: CoachAdminEditDomain =
      payload.domain && isCoachAdminEditDomain(payload.domain) ? payload.domain : "datos";
    const note =
      typeof payload.note === "string" && payload.note.trim()
        ? payload.note.trim()
        : "Revisamos tu perfil.";
    return {
      id: n.id,
      sectionLabel: COACH_ADMIN_EDIT_DOMAIN_LABELS[domain],
      note,
      detailsHref: COACH_ADMIN_EDIT_DOMAIN_HREFS[domain],
    };
  });

  return {
    adminEdits,
    profile: profile
      ? {
          slug: profile.slug as string,
          fullName: profile.full_name as string,
          avatarUrl: (profile.avatar_url as string | null) ?? null,
          status: profile.status as string,
          visibility: profile.visibility as string,
        }
      : null,
    application: application
      ? {
          id: application.id as string,
          status: (application.status as string | null) ?? null,
          rejectionReason: (application.rejection_reason as string | null) ?? null,
        }
      : null,
    subscription: sub
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
  };
}

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

  // Unread "staff corrected your profile" notifications → on-login toast feed.
  // Cheap indexed query (recipient_user_id, read_at). localStorage dedupes the
  // toast per device; read_at governs the persistent state.
  const adminEditRows = await db.query.notifications.findMany({
    where: (n, { and, eq, isNull }) =>
      and(
        eq(n.recipientUserId, user.id),
        eq(n.kind, "admin.profileCorrected"),
        isNull(n.readAt),
      ),
    orderBy: (n, { desc }) => desc(n.createdAt),
    limit: 10,
  });

  const adminEdits = adminEditRows.map((n) => {
    const payload = (n.payload ?? {}) as {
      domain?: string;
      note?: unknown;
      changedFields?: unknown;
    };
    const domain: AdminEditDomain =
      payload.domain && isAdminEditDomain(payload.domain) ? payload.domain : "datos";
    // Current rows carry the admin's `note`. Legacy rows (created before the
    // finalize-with-note change) carried `changedFields` and no note — fall back
    // so those never render a blank toast.
    let note = typeof payload.note === "string" ? payload.note.trim() : "";
    if (!note) {
      note =
        Array.isArray(payload.changedFields) && payload.changedFields.length > 0
          ? `Actualizamos: ${(payload.changedFields as string[]).join(", ")}.`
          : "Revisamos tu perfil.";
    }
    return {
      id: n.id,
      domain,
      note,
      detailsHref: ADMIN_EDIT_DOMAIN_HREFS[domain],
    };
  });

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
    adminEdits,
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
              href="mailto:info@ballershub.co"
              className="text-bh-lime underline-offset-4 hover:underline"
            >
              info@ballershub.co
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
