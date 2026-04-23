import Link from "next/link";
import { redirect } from "next/navigation";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import TaskSeverityChip from "@/components/dashboard/client/TaskSeverityChip";
import DashboardProgressList, {
  type DashboardProgressSection,
} from "@/components/dashboard/client/overview/DashboardProgressList";
import DashboardStatusSummary, {
  type DashboardStatusSummaryProps,
} from "@/components/dashboard/client/overview/DashboardStatusSummary";
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
import ManagerOverview from "@/components/dashboard/manager/ManagerOverview";

type PlayerOverview = TaskProfileSnapshot & { updated_at: string | null };

type ApplicationOverview = {
  status: string;
  created_at: string;
  plan_requested: string | null;
  full_name: string | null;
  nationality: string[] | null;
  positions: string[] | null;
  current_club: string | null;
  notes: string | null;
};

const QUICK_ACTIONS = [
  {
    id: "multimedia",
    title: "Gestionar multimedia",
    description: "Fotos, videos y novedades para potenciar tu perfil.",
    href: "/dashboard/edit-profile/multimedia",
  },
  {
    id: "subscription",
    title: "Estado de la suscripción",
    description: "Revisá tu plan actual y próximos cobros.",
    href: "/dashboard/settings/subscription",
  },
  {
    id: "account",
    title: "Preferencias de cuenta",
    description: "Actualizá correo, seguridad y notificaciones.",
    href: "/dashboard/settings/account",
  },
];

const PROGRESS_COPY: Record<string, { title: string; description: string; href: string }> = {
  "personal-data": {
    title: "Datos personales",
    description: "Información básica, contacto y biografía completa.",
    href: "/dashboard/edit-profile/personal-data",
  },
  "football-data": {
    title: "Datos futbolísticos",
    description: "Trayectoria deportiva, club actual y posiciones.",
    href: "/dashboard/edit-profile/football-data",
  },
  multimedia: {
    title: "Multimedia",
    description: "Fotos e historias que enriquecen tu perfil público.",
    href: "/dashboard/edit-profile/multimedia",
  },
};

const PROFILE_STATUS_META: Record<
  string,
  { label: string; message: string; color: DashboardStatusSummaryProps["profileStatus"]["color"] }
> = {
  draft: {
    label: "Borrador",
    message: "Tu perfil está en construcción. Completá los pasos pendientes para enviarlo a revisión.",
    color: "warning",
  },
  pending_review: {
    label: "En revisión",
    message: "Nuestro equipo está validando la información enviada. Recibirás una notificación con el resultado.",
    color: "primary",
  },
  approved: {
    label: "Publicado",
    message: "Tu perfil está aprobado y listo para compartirse con clubes y reclutadores.",
    color: "success",
  },
  rejected: {
    label: "Rechazado",
    message: "Necesitamos ajustes en tu solicitud. Revisá los comentarios y volvé a enviarla.",
    color: "danger",
  },
  missing: {
    label: "Sin perfil",
    message: "Creá tu solicitud para generar el perfil profesional y desbloquear las secciones de edición.",
    color: "default",
  },
};

const APPLICATION_STATUS_META: Record<
  string,
  { label: string; message: string; color: DashboardStatusSummaryProps["profileStatus"]["color"] }
> = {
  pending: {
    label: "En revisión",
    message: "Recibimos tu solicitud y la estamos evaluando. Mientras tanto podrás seguir consultando el estado desde aquí.",
    color: "primary",
  },
  approved: {
    label: "Aprobada",
    message: "La solicitud fue aprobada. Ya podés completar y publicar tu perfil profesional.",
    color: "success",
  },
  rejected: {
    label: "Rechazada",
    message: "Tu solicitud fue rechazada. Podés realizar los ajustes necesarios y reenviarla cuando estés listo.",
    color: "danger",
  },
};

function getProfileSummary(
  profile: PlayerOverview | null,
  application: ApplicationOverview | null,
): DashboardStatusSummaryProps {
  const statusKey = profile ? profile.status : "missing";
  const statusMeta = PROFILE_STATUS_META[statusKey] ?? PROFILE_STATUS_META.missing;

  const applicationMeta = application
    ? APPLICATION_STATUS_META[application.status] ?? {
        label: application.status,
        message: "Consultá con soporte para obtener más información sobre el estado de tu solicitud.",
        color: "default" as const,
      }
    : null;

  const formattedCreatedAt = application
    ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(application.created_at))
    : null;

  const cta = getPrimaryCta(profile, application);

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
          createdAtLabel: formattedCreatedAt ? `Última actualización: ${formattedCreatedAt}` : null,
        }
      : null,
    cta,
  };
}

function getPrimaryCta(
  profile: PlayerOverview | null,
  application: ApplicationOverview | null,
): DashboardStatusSummaryProps["cta"] {
  if (!profile) {
    if (application?.status === "pending") {
      return {
        label: "Ver solicitud",
        href: "/onboarding/player/apply",
        variant: "bordered",
        color: "primary",
      };
    }

    if (application?.status === "rejected") {
      return {
        label: "Reabrir onboarding",
        href: "/onboarding/start",
        variant: "solid",
        color: "warning",
      };
    }

    if (application?.status === "approved") {
      return {
        label: "Configurar perfil",
        href: "/dashboard/edit-profile/personal-data",
        variant: "solid",
        color: "primary",
      };
    }

    return {
      label: "Crear solicitud",
      href: "/onboarding/start",
      variant: "solid",
      color: "primary",
    };
  }

  switch (profile.status) {
    case "approved":
      if (profile.slug) {
        return {
          label: "Ver perfil público",
          href: `/${profile.slug}`,
          variant: "solid",
          color: "primary",
        };
      }
      return {
        label: "Configurar URL pública",
        href: "/dashboard/edit-profile/personal-data",
        variant: "solid",
        color: "primary",
      };
    case "draft":
      return {
        label: "Completar datos pendientes",
        href: "/dashboard/edit-profile/personal-data",
        variant: "solid",
        color: "primary",
      };
    case "pending_review":
      return {
        label: "Ver solicitud",
        href: "/onboarding/player/apply",
        variant: "bordered",
        color: "primary",
      };
    case "rejected":
      return {
        label: "Reabrir onboarding",
        href: "/onboarding/start",
        variant: "solid",
        color: "warning",
      };
    default:
      return undefined;
  }
}

function buildProgressSectionsFromTasks(
  evaluation: TaskEvaluation,
): DashboardProgressSection[] {
  return Object.entries(PROGRESS_COPY).map(([sectionId, meta]) => {
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
    .select("status, created_at, agency_name")
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

  const statusSummary = getProfileSummary(profile, application);
  const progressSections = buildProgressSectionsFromTasks(taskEvaluation);
  const nextSteps = selectNextSteps(taskEvaluation);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumen general"
        description="Visualizá el estado de tu perfil y los próximos pasos recomendados."
      />

      <SectionCard
        title="Estado del perfil"
        description="Controlá el progreso de tu perfil profesional y accedé rápidamente a las acciones clave."
      >
        <DashboardStatusSummary {...statusSummary} />
      </SectionCard>

      <SectionCard
        title="Progreso por secciones"
        description="Identificá qué partes de tu perfil necesitan atención para llegar a la publicación."
      >
        <DashboardProgressList sections={progressSections} />
      </SectionCard>

      <SectionCard
        title="Próximos pasos"
        description="Estas tareas te ayudarán a completar la información necesaria para publicar tu perfil."
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
            ¡Excelente! No tenés tareas pendientes. Seguiremos sumando recomendaciones a medida que incorporemos nuevas
            funcionalidades.
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="Atajos rápidos"
        description="Accedé directamente a las secciones que vas a utilizar con mayor frecuencia."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="flex h-full flex-col justify-between rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 transition-colors hover:border-neutral-700"
            >
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">{action.title}</p>
                <p className="text-xs text-neutral-400">{action.description}</p>
              </div>
              <span className="mt-4 text-xs font-medium text-primary">Ir a la sección →</span>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
