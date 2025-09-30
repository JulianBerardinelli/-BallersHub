import Link from "next/link";
import { redirect } from "next/navigation";
import FormField from "@/components/dashboard/client/FormField";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import TaskCalloutList from "@/components/dashboard/client/TaskCalloutList";
import LockedSection from "@/components/dashboard/client/LockedSection";
import { fetchPlayerTaskMetrics } from "@/lib/dashboard/client/metrics";
import {
  buildTaskContext,
  getPendingTasksForSection,
  type TaskProfileSnapshot,
} from "@/lib/dashboard/client/task-context";
import { evaluateDashboardTasks, orderTasksBySeverity } from "@/lib/dashboard/client/tasks";
import {
  extractApplicationLinks,
  hydrateTaskProfileSnapshot,
  pickFirstPresent,
} from "@/lib/dashboard/client/profile-data";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolveDashboardAccess } from "@/lib/dashboard/client/permissions";

type CareerItem = {
  id: string;
  club: string | null;
  division: string | null;
  start_date: string | null;
  end_date: string | null;
};

type PlayerApplicationSnapshot = {
  id: string;
  full_name: string | null;
  nationality: string[] | null;
  positions: string[] | null;
  current_club: string | null;
  transfermarkt_url: string | null;
  external_profile_url: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

type PlayerMediaItem = {
  id: string;
  type: "photo" | "video" | "doc";
  url: string;
  title: string | null;
  provider: string | null;
};

export default async function FootballDataPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard/edit-profile/football-data");

  const dashboardState = await fetchDashboardState(supabase, user.id);

  const profileData = dashboardState.profile;
  const applicationData = dashboardState.application;

  if (!profileData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Datos futbolísticos"
          description="Creá tu perfil para gestionar trayectoria, estadísticas y enlaces deportivos."
        />
        <SectionCard
          title="Información no disponible"
          description="Completá primero tu onboarding para habilitar la gestión de datos deportivos."
        >
          <p className="text-sm text-neutral-300">
            Una vez que tu perfil esté creado, podrás editar tus posiciones, trayectoria y estadísticas relevantes. Iniciá el{' '}
            <Link href="/onboarding/start" className="text-primary underline">
              onboarding
            </Link>{' '}
            para continuar.
          </p>
        </SectionCard>
      </div>
    );
  }

  const access = resolveDashboardAccess({
    profileStatus: profileData.status,
    hasProfile: true,
    applicationStatus: applicationData?.status ?? null,
  });

  if (access.profileLock) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Datos futbolísticos"
          description="Organizá toda tu información deportiva para construir un perfil completo y actualizado."
        />
        <LockedSection {...access.profileLock} />
      </div>
    );
  }

  const [careerResult, mediaResult, metrics] = await Promise.all([
    supabase
      .from("career_items")
      .select("id, club, division, start_date, end_date")
      .eq("player_id", profileData.id)
      .order("start_date", { ascending: false }),
    supabase
      .from("player_media")
      .select("id, type, url, title, provider")
      .eq("player_id", profileData.id)
      .order("created_at", { ascending: true }),
    fetchPlayerTaskMetrics(supabase, profileData.id),
  ]);

  const careerRaw = careerResult.data;
  const mediaRaw = mediaResult.data;

  const career = (careerRaw as CareerItem[] | null) ?? null;
  const media = (mediaRaw as PlayerMediaItem[] | null) ?? [];

  const primaryHighlight = media.find((item) => item.type === "video") ?? null;

  const application: PlayerApplicationSnapshot | null = applicationData
    ? {
        id: applicationData.id,
        full_name: applicationData.full_name ?? null,
        nationality: applicationData.nationality ?? null,
        positions: applicationData.positions ?? null,
        current_club: applicationData.current_club ?? null,
        transfermarkt_url: applicationData.transfermarkt_url ?? null,
        external_profile_url: applicationData.external_profile_url ?? null,
        notes: applicationData.notes ?? null,
        status: applicationData.status ?? null,
        created_at: applicationData.created_at ?? null,
      }
    : null;

  const applicationLinks = extractApplicationLinks(application);

  const normalizedProfile: TaskProfileSnapshot = {
    id: profileData.id,
    status: profileData.status,
    slug: profileData.slug ?? null,
    visibility: profileData.visibility,
    full_name: profileData.full_name ?? null,
    birth_date: profileData.birth_date ?? null,
    nationality: profileData.nationality ?? null,
    positions: profileData.positions ?? null,
    current_club: profileData.current_club ?? null,
    bio: profileData.bio ?? null,
    avatar_url: profileData.avatar_url ?? dashboardState.primaryPhotoUrl ?? null,
    foot: profileData.foot ?? null,
    height_cm: profileData.height_cm ?? null,
    weight_kg: profileData.weight_kg ?? null,
  };

  const hydratedProfile =
    hydrateTaskProfileSnapshot(normalizedProfile, application ?? null) ?? normalizedProfile;

  const taskEvaluation = evaluateDashboardTasks(buildTaskContext(hydratedProfile, metrics));
  const pendingTasks = orderTasksBySeverity(getPendingTasksForSection(taskEvaluation, "football-data"));
  const taskCallouts = pendingTasks.map((task) => ({
    id: task.id,
    severity: task.severity,
    title: task.title,
    description: task.description,
    href: task.href,
  }));

  const positions = Array.isArray(hydratedProfile.positions)
    ? hydratedProfile.positions.join(", ")
    : "";
  const dominantFoot = hydratedProfile.foot ?? "";
  const currentClub = hydratedProfile.current_club ?? "";
  const marketValue = profileData.market_value_eur ? String(profileData.market_value_eur) : "";
  const highlightUrl = pickFirstPresent(
    primaryHighlight?.url ?? null,
    applicationLinks.youtube,
    applicationLinks.social,
  );
  const transfermarktUrl = applicationLinks.transfermarkt ?? "";
  const besoccerUrl = applicationLinks.besoccer ?? "";
  const youtubeUrl = pickFirstPresent(
    applicationLinks.youtube,
    primaryHighlight?.url && /youtu(be|\.com)/i.test(primaryHighlight.url)
      ? primaryHighlight.url
      : null,
  );
  const instagramUrl = pickFirstPresent(
    applicationLinks.instagram,
    applicationLinks.social && /instagram\.com/i.test(applicationLinks.social)
      ? applicationLinks.social
      : null,
  );
  const linkedinUrl = pickFirstPresent(
    applicationLinks.linkedin,
    applicationLinks.social && /linkedin\.com/i.test(applicationLinks.social)
      ? applicationLinks.social
      : null,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Datos futbolísticos"
        description="Organizá toda tu información deportiva para construir un perfil completo y actualizado."
      />

      <TaskCalloutList tasks={taskCallouts} />

      <SectionCard
        title="Perfil deportivo"
        description="Definí tus posiciones naturales, perfil y club actual para orientar a scouts y clubes."
      >
        <form className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              id="positions"
              label="Posiciones principales"
              defaultValue={positions}
              placeholder="Ej: Mediocentro, Interior Derecho"
            />
            <FormField
              id="foot"
              label="Perfil dominante"
              defaultValue={dominantFoot}
              placeholder="Derecho, Izquierdo, Ambidiestro"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              id="current_club"
              label="Club actual"
              defaultValue={currentClub}
              placeholder="Equipo o agencia actual"
            />
            <FormField
              id="contract_status"
              label="Situación contractual"
              placeholder="Libre, con contrato hasta 2026, etc."
              description="Configuración pendiente de integración con contratos y documentos."
            />
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Trayectoria"
        description="Registrar cada etapa de tu carrera te ayudará a generar reportes y CV automáticos."
        footer="Muy pronto podrás cargar experiencias, competiciones y estadísticas por temporada."
      >
        {career && career.length > 0 ? (
          <ul className="space-y-3">
            {career.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{item.club ?? "Club sin definir"}</p>
                    <p className="text-xs text-neutral-400">{item.division ?? "División pendiente"}</p>
                  </div>
                  <p className="text-xs text-neutral-400">
                    {formatSeason(item.start_date, item.end_date)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-6 text-sm text-neutral-400">
            Todavía no registraste experiencias. Podrás importar trayectorias desde aplicaciones, archivos o integraciones de terceros.
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Referencias y enlaces"
        description="Conectá tu perfil con plataformas externas para validar tu experiencia."
      >
        <form className="grid gap-4 md:grid-cols-2">
          <FormField
            id="highlight"
            label="Video destacado"
            placeholder="Link a tu mejor highlight"
            defaultValue={highlightUrl ?? ""}
          />
          <FormField
            id="transfermarkt"
            label="Transfermarkt"
            placeholder="URL pública"
            defaultValue={transfermarktUrl}
          />
          <FormField
            id="besoccer"
            label="BeSoccer"
            placeholder="URL pública"
            defaultValue={besoccerUrl}
          />
          <FormField
            id="youtube"
            label="YouTube"
            placeholder="Canal o playlist"
            defaultValue={youtubeUrl ?? ""}
          />
          <FormField
            id="instagram"
            label="Instagram"
            placeholder="Usuario o URL"
            defaultValue={instagramUrl ?? ""}
          />
          <FormField
            id="linkedin"
            label="LinkedIn"
            placeholder="Perfil profesional"
            defaultValue={linkedinUrl ?? ""}
          />
        </form>
      </SectionCard>

      <SectionCard
        title="Palmarés y reconocimientos"
        description="Documentá títulos, premios individuales y estadísticas destacadas."
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-6 text-sm text-neutral-400">
            Aquí podrás cargar logros, premios y estadísticas relevantes para mostrar en tu CV digital.
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
            <span className="rounded-full border border-neutral-800 px-3 py-1">🏆 Campeonatos</span>
            <span className="rounded-full border border-neutral-800 px-3 py-1">⭐ Premios individuales</span>
            <span className="rounded-full border border-neutral-800 px-3 py-1">📈 Estadísticas clave</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Valor de mercado y proyección"
        description="Consolidá métricas económicas para potenciar negociaciones con clubes y agentes."
      >
        <form className="grid gap-4 md:grid-cols-2">
          <FormField
            id="market_value"
            label="Valor de mercado"
            defaultValue={marketValue}
            placeholder="Ej: 250000"
            description="El dato podrá integrarse con plataformas externas para mantenerlo actualizado."
          />
          <FormField
            id="expectations"
            label="Objetivos de carrera"
            placeholder="Ej: Firmar en Primera División, disputar competencias internacionales"
            description="Se utilizará para personalizar la comunicación con agentes y reclutadores."
          />
        </form>
      </SectionCard>
    </div>
  );
}

function formatSeason(start: string | null, end: string | null) {
  if (!start && !end) return "Temporada pendiente";
  const startYear = start ? new Date(start).getFullYear() : "¿?";
  const endYear = end ? new Date(end).getFullYear() : "Actualidad";
  return `${startYear} - ${endYear}`;
}
