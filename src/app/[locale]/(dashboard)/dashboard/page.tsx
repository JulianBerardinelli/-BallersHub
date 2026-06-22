import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import CoachOverview from "./CoachOverview";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import TaskSeverityChip from "@/components/dashboard/client/TaskSeverityChip";
import DashboardProgressList, {
  type DashboardProgressSection,
} from "@/components/dashboard/client/overview/DashboardProgressList";
import DashboardStatusSummary, {
  type DashboardStatusSummaryProps,
} from "@/components/dashboard/client/overview/DashboardStatusSummary";
import type { ApplicationReviewDetails } from "@/components/dashboard/client/overview/ApplicationReviewModal";
import { db } from "@/lib/db";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { fetchPlayerTaskMetrics } from "@/lib/dashboard/client/metrics";
import {
  evaluateDashboardTasks,
  orderTasksBySeverity,
  type EvaluatedTask,
  type TaskEvaluation,
} from "@/lib/dashboard/client/tasks";
import {
  EMPTY_PLAYER_TASK_METRICS,
  buildTaskContext,
  type TaskProfileSnapshot,
} from "@/lib/dashboard/client/task-context";
import { hydrateTaskProfileSnapshot } from "@/lib/dashboard/client/profile-data";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolveOnboardingHref } from "@/lib/dashboard/onboarding-href";
import ManagerOverview from "@/components/dashboard/manager/ManagerOverview";

type PlayerOverview = TaskProfileSnapshot & { updated_at: string | null };

type ApplicationOverview = {
  id: string;
  status: string;
  created_at: string;
  plan_requested: string | null;
  full_name: string | null;
  nationality: string[] | null;
  positions: string[] | null;
  current_club: string | null;
  notes: string | null;
};

type Translator = Awaited<ReturnType<typeof getTranslations>>;

function buildQuickActions(t: Translator) {
  return [
    {
      id: "multimedia",
      title: t("home.quickActions.multimedia.title"),
      description: t("home.quickActions.multimedia.description"),
      href: "/dashboard/edit-profile/multimedia",
    },
    {
      id: "subscription",
      title: t("home.quickActions.subscription.title"),
      description: t("home.quickActions.subscription.description"),
      href: "/dashboard/settings/subscription",
    },
    {
      id: "account",
      title: t("home.quickActions.account.title"),
      description: t("home.quickActions.account.description"),
      href: "/dashboard/settings/account",
    },
  ];
}

const PROGRESS_HREFS: Record<string, string> = {
  "personal-data": "/dashboard/edit-profile/personal-data",
  "football-data": "/dashboard/edit-profile/football-data",
  multimedia: "/dashboard/edit-profile/multimedia",
};

function buildProgressCopy(
  t: Translator,
): Record<string, { title: string; description: string; href: string }> {
  return {
    "personal-data": {
      title: t("home.progress.personalData.title"),
      description: t("home.progress.personalData.description"),
      href: PROGRESS_HREFS["personal-data"],
    },
    "football-data": {
      title: t("home.progress.footballData.title"),
      description: t("home.progress.footballData.description"),
      href: PROGRESS_HREFS["football-data"],
    },
    multimedia: {
      title: t("home.progress.multimedia.title"),
      description: t("home.progress.multimedia.description"),
      href: PROGRESS_HREFS.multimedia,
    },
  };
}

type StatusMeta = {
  label: string;
  message: string;
  color: DashboardStatusSummaryProps["profileStatus"]["color"];
};

function buildProfileStatusMeta(t: Translator): Record<string, StatusMeta> {
  return {
    draft: {
      label: t("home.profileStatus.draft.label"),
      message: t("home.profileStatus.draft.message"),
      color: "warning",
    },
    pending_review: {
      label: t("home.profileStatus.pendingReview.label"),
      message: t("home.profileStatus.pendingReview.message"),
      color: "primary",
    },
    approved: {
      label: t("home.profileStatus.approved.label"),
      message: t("home.profileStatus.approved.message"),
      color: "success",
    },
    rejected: {
      label: t("home.profileStatus.rejected.label"),
      message: t("home.profileStatus.rejected.message"),
      color: "danger",
    },
    missing: {
      label: t("home.profileStatus.missing.label"),
      message: t("home.profileStatus.missing.message"),
      color: "default",
    },
  };
}

function buildApplicationStatusMeta(t: Translator): Record<string, StatusMeta> {
  return {
    pending: {
      label: t("home.applicationStatus.pending.label"),
      message: t("home.applicationStatus.pending.message"),
      color: "primary",
    },
    approved: {
      label: t("home.applicationStatus.approved.label"),
      message: t("home.applicationStatus.approved.message"),
      color: "success",
    },
    rejected: {
      label: t("home.applicationStatus.rejected.label"),
      message: t("home.applicationStatus.rejected.message"),
      color: "danger",
    },
  };
}

function getProfileSummary(
  t: Translator,
  profile: PlayerOverview | null,
  application: ApplicationOverview | null,
  onboardingHref: string,
): DashboardStatusSummaryProps {
  const profileStatusMeta = buildProfileStatusMeta(t);
  const applicationStatusMeta = buildApplicationStatusMeta(t);

  const statusKey = profile ? profile.status : "missing";
  const statusMeta = profileStatusMeta[statusKey] ?? profileStatusMeta.missing;

  const applicationMeta = application
    ? applicationStatusMeta[application.status] ?? {
        label: application.status,
        message: t("home.applicationStatus.unknownMessage"),
        color: "default" as const,
      }
    : null;

  const formattedCreatedAt = application
    ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(application.created_at))
    : null;

  const cta = getPrimaryCta(t, profile, application, onboardingHref);

  return {
    profileStatus: {
      code: statusKey,
      label: statusMeta.label,
      message: statusMeta.message,
      color: statusMeta.color,
    },
    visibility: profile?.visibility ?? null,
    publicUrl: profile?.slug ? `/${profile.slug}` : null,
    updatedAt: profile?.updated_at ?? null,
    applicationStatus: applicationMeta
      ? {
          label: applicationMeta.label,
          message: applicationMeta.message,
          color: applicationMeta.color,
          createdAtLabel: formattedCreatedAt
            ? t("home.applicationStatus.lastUpdated", { date: formattedCreatedAt })
            : null,
        }
      : null,
    cta,
  };
}

function buildPlayerReviewDetails(
  t: Translator,
  application: ApplicationOverview,
  profileStatus?: string,
): ApplicationReviewDetails {
  const status = profileStatus ?? application.status;
  const isPending = status === "pending" || status === "pending_review";
  return {
    id: application.id,
    type: "player",
    status,
    statusLabel: isPending
      ? t("home.applicationStatus.pending.label")
      : status === "approved"
        ? t("home.applicationStatus.approved.label")
        : status === "rejected"
          ? t("home.applicationStatus.rejected.label")
          : status,
    statusColor: isPending
      ? "primary"
      : status === "approved"
        ? "success"
        : status === "rejected"
          ? "danger"
          : "default",
    createdAt: application.created_at,
    planRequested: application.plan_requested,
    fullName: application.full_name,
    positions: application.positions,
    nationality: application.nationality,
    currentClub: application.current_club,
    notes: application.notes,
  };
}

function getPrimaryCta(
  t: Translator,
  profile: PlayerOverview | null,
  application: ApplicationOverview | null,
  onboardingHref: string,
): DashboardStatusSummaryProps["cta"] {
  if (!profile) {
    if (application?.status === "pending") {
      return {
        kind: "review-application",
        label: t("home.cta.viewApplication"),
        variant: "bordered",
        color: "primary",
        details: buildPlayerReviewDetails(t, application),
      };
    }

    if (application?.status === "rejected") {
      return {
        label: t("home.cta.reopenOnboarding"),
        href: onboardingHref,
        variant: "solid",
        color: "warning",
      };
    }

    if (application?.status === "approved") {
      return {
        label: t("home.cta.configureProfile"),
        href: "/dashboard/edit-profile/personal-data",
        variant: "solid",
        color: "primary",
      };
    }

    return {
      label: t("home.cta.createApplication"),
      href: onboardingHref,
      variant: "solid",
      color: "primary",
    };
  }

  switch (profile.status) {
    case "approved":
      if (profile.slug) {
        return {
          label: t("home.cta.viewPublicProfile"),
          href: `/${profile.slug}`,
          variant: "solid",
          color: "primary",
        };
      }
      return {
        label: t("home.cta.configurePublicUrl"),
        href: "/dashboard/edit-profile/personal-data",
        variant: "solid",
        color: "primary",
      };
    case "draft":
      return {
        label: t("home.cta.completePendingData"),
        href: "/dashboard/edit-profile/personal-data",
        variant: "solid",
        color: "primary",
      };
    case "pending_review":
      if (application) {
        return {
          kind: "review-application",
          label: t("home.cta.viewApplication"),
          variant: "bordered",
          color: "primary",
          details: buildPlayerReviewDetails(t, application, "pending_review"),
        };
      }
      return undefined;
    case "rejected":
      return {
        label: t("home.cta.reopenOnboarding"),
        href: onboardingHref,
        variant: "solid",
        color: "warning",
      };
    default:
      return undefined;
  }
}

function buildProgressSectionsFromTasks(
  evaluation: TaskEvaluation,
  progressCopy: Record<string, { title: string; description: string; href: string }>,
): DashboardProgressSection[] {
  return Object.entries(progressCopy).map(([sectionId, meta]) => {
    const summary =
      evaluation.sections[sectionId] ?? {
        total: 0,
        completed: 0,
        pending: 0,
        severityCounts: { danger: 0, warning: 0, secondary: 0 },
      };

    const missing = evaluation.tasks
      .filter((task) => task.sectionId === sectionId && !task.completed)
      .map((task) => ({ label: task.title, severity: task.severity }));

    return {
      id: sectionId,
      ...meta,
      completed: summary.completed,
      total: summary.total,
      missing,
    } satisfies DashboardProgressSection;
  });
}

function selectNextSteps(evaluation: TaskEvaluation): EvaluatedTask[] {
  const danger = orderTasksBySeverity(evaluation.bySeverity.danger);
  const warning = orderTasksBySeverity(evaluation.bySeverity.warning);
  const secondary = orderTasksBySeverity(evaluation.bySeverity.secondary);

  if (danger.length > 0) {
    return [...danger, ...warning];
  }

  if (warning.length > 0) {
    return warning;
  }

  return secondary;
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard");

  // Coach early-branch — coaches render the coach panel, never the player/manager
  // overview. The layout (loadCoachShellData) already wraps this page in the
  // coach shell; without this branch the index renders the player empty-state
  // ("completá tu perfil de jugador" + professional-account CTA) inside it.
  // Mirrors loadCoachShellData's detection (role='coach', or member + coach app).
  {
    const { data: coachUp } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    const coachRole = coachUp?.role ?? "member";
    if (coachRole === "coach" || coachRole === "member") {
      const { data: coachApp } = await supabase
        .from("coach_applications")
        .select("status, rejection_reason")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (coachRole === "coach" || coachApp) {
        const { data: coachProfile } = await supabase
          .from("coach_profiles")
          .select("slug, full_name, status, visibility")
          .eq("user_id", user.id)
          .maybeSingle();
        return (
          <CoachOverview
            profile={
              coachProfile
                ? {
                    slug: coachProfile.slug as string,
                    fullName: coachProfile.full_name as string,
                    status: coachProfile.status as string,
                    visibility: coachProfile.visibility as string,
                  }
                : null
            }
            application={
              coachApp
                ? {
                    status: (coachApp.status as string | null) ?? null,
                    rejectionReason: (coachApp.rejection_reason as string | null) ?? null,
                  }
                : null
            }
          />
        );
      }
    }
  }

  const dashboardState = await fetchDashboardState(supabase, user.id);

  const profile = dashboardState.profile
    ? ({
        id: dashboardState.profile.id,
        status: dashboardState.profile.status,
        slug: dashboardState.profile.slug ?? null,
        visibility: dashboardState.profile.visibility,
        full_name: dashboardState.profile.full_name ?? null,
        birth_date: dashboardState.profile.birth_date ?? null,
        nationality: dashboardState.profile.nationality ?? null,
        positions: dashboardState.profile.positions ?? null,
        current_club: dashboardState.profile.current_club ?? null,
        bio: dashboardState.profile.bio ?? null,
        avatar_url: dashboardState.profile.avatar_url ?? dashboardState.primaryPhotoUrl ?? null,
        foot: dashboardState.profile.foot ?? null,
        height_cm: dashboardState.profile.height_cm ?? null,
        weight_kg: dashboardState.profile.weight_kg ?? null,
        updated_at: dashboardState.profile.updated_at ?? null,
      } satisfies PlayerOverview)
    : null;

  const application = dashboardState.application
    ? ({
        id: dashboardState.application.id,
        status: dashboardState.application.status ?? "pending",
        created_at: dashboardState.application.created_at ?? "",
        plan_requested: dashboardState.application.plan_requested ?? null,
        full_name: dashboardState.application.full_name ?? null,
        nationality: dashboardState.application.nationality ?? null,
        positions: dashboardState.application.positions ?? null,
        current_club: dashboardState.application.current_club ?? null,
        notes: dashboardState.application.notes ?? null,
      } satisfies ApplicationOverview)
    : null;

  const { data: up } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle();
  const role = up?.role || "member";

  // En caso de que sea una solicitud Manager (el rol "member" lo mantiene si aún no se le aprueba su agencia)
  const { data: managerApp } = await supabase
    .from("manager_applications")
    .select(
      "id, status, created_at, updated_at, agency_name, full_name, contact_email, contact_phone, agency_website_url, notes",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isManager = role === "manager" || !!managerApp;

  // Removed forced redirect to allow empty state dashboard rendering
  // if (role === "member" && !profile && !application && !managerApp) {
  //   redirect("/onboarding/start");
  // }

  if (isManager) {
    let agencyData = null;
    
    if (up?.agency_id) {
       const agency = await db.query.agencyProfiles.findFirst({
         where: (a, { eq }) => eq(a.id, up.agency_id!),
         with: {
           players: { columns: { id: true } },
           invites: { columns: { id: true } }
         }
       });
       
       if (agency) {
         // +1 for the main owner/manager creating the agency
         agencyData = {
           slug: agency.slug,
           playersCount: agency.players.length,
           staffCount: agency.invites.length + 1
         };
       }
    }
  
    return <ManagerOverview managerApp={managerApp} role={role} agencyData={agencyData} />;
  }

  const metrics = profile ? await fetchPlayerTaskMetrics(supabase, profile.id) : EMPTY_PLAYER_TASK_METRICS;
  const normalizedProfile: TaskProfileSnapshot | null = profile
    ? {
        id: profile.id,
        status: profile.status,
        slug: profile.slug ?? null,
        visibility: profile.visibility,
        full_name: profile.full_name ?? null,
        birth_date: profile.birth_date ?? null,
        nationality: profile.nationality ?? null,
        positions: profile.positions ?? null,
        current_club: profile.current_club ?? null,
        bio: profile.bio ?? null,
        avatar_url: profile.avatar_url ?? null,
        foot: profile.foot ?? null,
        height_cm: profile.height_cm ?? null,
        weight_kg: profile.weight_kg ?? null,
      }
    : null;

  const hydratedProfile = hydrateTaskProfileSnapshot(normalizedProfile, application ?? null);

  const taskContext = buildTaskContext(hydratedProfile ?? normalizedProfile, metrics);
  const taskEvaluation = evaluateDashboardTasks(taskContext);

  const t = await getTranslations("dashboard");

  const onboardingHref = resolveOnboardingHref(dashboardState.subscription?.planId ?? null);
  const statusSummary = getProfileSummary(t, profile, application, onboardingHref);
  const progressSections = buildProgressSectionsFromTasks(taskEvaluation, buildProgressCopy(t));
  const nextSteps = selectNextSteps(taskEvaluation);
  const quickActions = buildQuickActions(t);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("home.header.title")}
        description={t("home.header.description")}
      />

      <SectionCard
        title={t("home.profileStatusCard.title")}
        description={t("home.profileStatusCard.description")}
      >
        <DashboardStatusSummary {...statusSummary} />
      </SectionCard>

      <SectionCard
        title={t("home.progressCard.title")}
        description={t("home.progressCard.description")}
      >
        <DashboardProgressList sections={progressSections} />
      </SectionCard>

      <SectionCard
        title={t("home.nextStepsCard.title")}
        description={t("home.nextStepsCard.description")}
      >
        {nextSteps.length > 0 ? (
          <ol className="space-y-3 text-sm text-neutral-300">
            {nextSteps.map((task) => {
              return (
                <li
                  key={task.id}
                  className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-4 transition-colors hover:border-neutral-700"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Link href={task.href} className="text-sm font-semibold text-white underline-offset-4 hover:underline">
                        {task.title}
                      </Link>
                      <p className="text-xs text-neutral-400">{task.description}</p>
                    </div>
                    <TaskSeverityChip severity={task.severity} />
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-xs text-neutral-400">
            {t("home.nextStepsCard.empty")}
          </p>
        )}
      </SectionCard>

      <SectionCard
        title={t("home.quickActionsCard.title")}
        description={t("home.quickActionsCard.description")}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="flex h-full flex-col justify-between rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 transition-colors hover:border-neutral-700"
            >
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">{action.title}</p>
                <p className="text-xs text-neutral-400">{action.description}</p>
              </div>
              <span className="mt-4 text-xs font-medium text-primary">{t("home.quickActionsCard.goToSection")}</span>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
