import Link from "next/link";
import { redirect } from "next/navigation";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import DashboardProgressList, {
  type DashboardProgressSection,
} from "@/components/dashboard/client/overview/DashboardProgressList";
import DashboardStatusSummary, {
  type DashboardStatusSummaryProps,
} from "@/components/dashboard/client/overview/DashboardStatusSummary";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

type PlayerOverview = {
  id: string;
  status: string;
  slug: string | null;
  visibility: string;
  full_name: string | null;
  birth_date: string | null;
  nationality: string[] | null;
  positions: string[] | null;
  current_club: string | null;
  bio: string | null;
  updated_at: string | null;
};

type ApplicationOverview = {
  status: string;
  created_at: string;
  plan_requested: string | null;
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

const NEXT_STEPS = [
  {
    id: "personal-data",
    title: "Actualizar datos personales",
    description: "Completá información de contacto y tu biografía.",
    href: "/dashboard/edit-profile/personal-data",
  },
  {
    id: "football-data",
    title: "Cargar datos futbolísticos",
    description: "Sumá trayectoria, club actual y links relevantes.",
    href: "/dashboard/edit-profile/football-data",
  },
  {
    id: "multimedia",
    title: "Publicar material multimedia",
    description: "Agregá fotos, videos y notas para potenciar tu perfil.",
    href: "/dashboard/edit-profile/multimedia",
  },
];

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

type PersonalProgress = {
  completed: number;
  total: number;
  missing: string[];
};

function isFilled(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  return value !== null && value !== undefined;
}

function computePersonalDataProgress(profile: PlayerOverview | null): PersonalProgress {
  const checklist = [
    { label: "Nombre completo", done: isFilled(profile?.full_name) },
    { label: "Fecha de nacimiento", done: isFilled(profile?.birth_date) },
    { label: "Nacionalidad", done: isFilled(profile?.nationality) },
    { label: "Posiciones", done: isFilled(profile?.positions) },
    { label: "Biografía", done: isFilled(profile?.bio) },
  ];

  const completed = checklist.filter((item) => item.done).length;
  const missing = checklist.filter((item) => !item.done).map((item) => item.label);
  return { completed, total: checklist.length, missing };
}

function computeFootballDataProgress(
  profile: PlayerOverview | null,
  careerItemsCount: number,
): PersonalProgress {
  const checklist = [
    { label: "Trayectoria profesional", done: careerItemsCount > 0 },
    { label: "Club actual", done: isFilled(profile?.current_club) },
    { label: "Posición principal", done: isFilled(profile?.positions) },
  ];

  const completed = checklist.filter((item) => item.done).length;
  const missing = checklist.filter((item) => !item.done).map((item) => item.label);
  return { completed, total: checklist.length, missing };
}

function computeMultimediaProgress(mediaCount: number): PersonalProgress {
  const checklist = [
    { label: "Galería de fotos", done: mediaCount > 0 },
  ];

  const completed = checklist.filter((item) => item.done).length;
  const missing = checklist.filter((item) => !item.done).map((item) => item.label);
  return { completed, total: checklist.length, missing };
}

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
    slug: profile?.slug ?? null,
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
  if (profile) {
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

  if (!application) {
    return {
      label: "Crear solicitud",
      href: "/onboarding/start",
      variant: "solid",
      color: "primary",
    };
  }

  if (application.status === "pending") {
    return {
      label: "Ver solicitud",
      href: "/onboarding/player/apply",
      variant: "bordered",
      color: "primary",
    };
  }

  if (application.status === "rejected") {
    return {
      label: "Reintentar solicitud",
      href: "/onboarding/start",
      variant: "solid",
      color: "warning",
    };
  }

  if (application.status === "approved") {
    return {
      label: "Configurar perfil",
      href: "/dashboard/edit-profile/personal-data",
      variant: "solid",
      color: "primary",
    };
  }

  return undefined;
}

function buildProgressSections(
  profile: PlayerOverview | null,
  careerItemsCount: number,
  mediaCount: number,
): DashboardProgressSection[] {
  const personal = computePersonalDataProgress(profile);
  const football = computeFootballDataProgress(profile, careerItemsCount);
  const multimedia = computeMultimediaProgress(mediaCount);

  return [
    {
      id: "personal-data",
      ...PROGRESS_COPY["personal-data"],
      completed: personal.completed,
      total: personal.total,
      missing: personal.missing,
    },
    {
      id: "football-data",
      ...PROGRESS_COPY["football-data"],
      completed: football.completed,
      total: football.total,
      missing: football.missing,
    },
    {
      id: "multimedia",
      ...PROGRESS_COPY.multimedia,
      completed: multimedia.completed,
      total: multimedia.total,
      missing: multimedia.missing,
    },
  ];
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard");

  const [{ data: profileRaw }, { data: applicationRaw }] = await Promise.all([
    supabase
      .from("player_profiles")
      .select(
        "id, status, slug, visibility, full_name, birth_date, nationality, positions, current_club, bio, updated_at",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("player_applications")
      .select("status, created_at, plan_requested")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = (profileRaw as PlayerOverview | null) ?? null;
  const application = (applicationRaw as ApplicationOverview | null) ?? null;

  const [careerCountResponse, mediaCountResponse] = profile
    ? await Promise.all([
        supabase
          .from("career_items")
          .select("id", { count: "exact", head: true })
          .eq("player_id", profile.id),
        supabase
          .from("player_media")
          .select("id", { count: "exact", head: true })
          .eq("player_id", profile.id),
      ])
    : [null, null];

  const careerItemsCount = careerCountResponse?.count ?? 0;
  const mediaCount = mediaCountResponse?.count ?? 0;

  const statusSummary = getProfileSummary(profile, application);
  const progressSections = buildProgressSections(profile, careerItemsCount, mediaCount);

  const nextStepsWithStatus = NEXT_STEPS.map((step) => {
    const progress = progressSections.find((section) => section.id === step.id);
    const pending = progress ? Math.max(progress.total - progress.completed, 0) : 0;
    return {
      ...step,
      pending,
      completed: pending === 0,
    };
  }).sort((a, b) => a.pending - b.pending);

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
        <ol className="space-y-3 text-sm text-neutral-300">
          {nextStepsWithStatus.map((step) => (
            <li
              key={step.id}
              className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-4 transition-colors hover:border-neutral-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <Link href={step.href} className="text-sm font-semibold text-white underline-offset-4 hover:underline">
                    {step.title}
                  </Link>
                  <p className="text-xs text-neutral-400">{step.description}</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    step.completed
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  }`}
                >
                  {step.completed ? "Completado" : `${step.pending} pendientes`}
                </span>
              </div>
            </li>
          ))}
        </ol>
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
