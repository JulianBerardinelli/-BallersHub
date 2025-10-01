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
import { fetchDashboardPublishingState } from "@/lib/dashboard/client/publishing-state";

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

  const access = resolveDashboardAccess({
    profileStatus: profileData?.status ?? null,
    hasProfile: Boolean(profileData),
    applicationStatus: applicationData?.status ?? null,
  });

  if (!profileData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Datos futbolísticos"
          description="Creá tu perfil para gestionar trayectoria, estadísticas y enlaces deportivos."
        />
        {access.profileLock ? <LockedSection {...access.profileLock} /> : null}
      </div>
    );
  }

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

  const [careerResult, mediaResult, metrics, publishingState] = await Promise.all([
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
    fetchDashboardPublishingState(supabase, profileData.id),
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
  const getLinkByKind = (kind: string) => publishingState.links.find((link) => link.kind === kind)?.url ?? null;

  const highlightUrl = pickFirstPresent(
    getLinkByKind("highlight"),
    primaryHighlight?.url ?? null,
    applicationLinks.youtube,
    applicationLinks.social,
  );
  const transfermarktUrl = pickFirstPresent(getLinkByKind("transfermarkt"), applicationLinks.transfermarkt) ?? "";
  const besoccerUrl = pickFirstPresent(getLinkByKind("besoccer"), applicationLinks.besoccer) ?? "";
  const youtubeUrl = pickFirstPresent(
    getLinkByKind("youtube"),
    applicationLinks.youtube,
    primaryHighlight?.url && /youtu(be|\.com)/i.test(primaryHighlight.url)
      ? primaryHighlight.url
      : null,
  ) ?? "";
  const instagramUrl = pickFirstPresent(
    getLinkByKind("instagram"),
    applicationLinks.instagram,
    applicationLinks.social && /instagram\.com/i.test(applicationLinks.social)
      ? applicationLinks.social
      : null,
  ) ?? "";
  const linkedinUrl = pickFirstPresent(
    getLinkByKind("linkedin"),
    applicationLinks.linkedin,
    applicationLinks.social && /linkedin\.com/i.test(applicationLinks.social)
      ? applicationLinks.social
      : null,
  ) ?? "";

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
        <div className="space-y-6">
          {publishingState.links.length > 0 ? (
            <ul className="space-y-3">
              {publishingState.links.map((link) => (
                <li
                  key={link.id}
                  className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        {formatLinkKind(link.kind)}
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {link.label ?? formatLinkKind(link.kind)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {getLinkKindDescription(link.kind)}
                      </p>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-xs text-primary underline"
                      >
                        {link.url}
                      </a>
                    </div>
                    {link.isPrimary ? (
                      <span className="inline-flex items-center rounded-full border border-primary/40 px-3 py-1 text-xs text-primary">
                        Principal
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-6 text-sm text-neutral-400">
              Aún no cargaste enlaces externos. Pronto podrás gestionarlos directamente desde esta sección.
            </div>
          )}

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

          <p className="text-xs text-neutral-500">
            Próximamente se habilitarán formularios para crear y editar enlaces personalizados directamente desde el dashboard.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Palmarés y reconocimientos"
        description="Documentá títulos, premios individuales y estadísticas destacadas."
      >
        <div className="space-y-4">
          {publishingState.honours.length > 0 ? (
            <ul className="space-y-3">
              {publishingState.honours.map((honour) => (
                <li
                  key={honour.id}
                  className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{honour.title}</p>
                      <p className="text-xs text-neutral-400">
                        {honour.competition ?? "Competencia pendiente"} · {honour.season ?? "Temporada sin definir"}
                      </p>
                      {honour.description ? (
                        <p className="text-xs text-neutral-400">{honour.description}</p>
                      ) : null}
                    </div>
                    <p className="text-xs text-neutral-500">{formatHonourDate(honour.awardedOn)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-6 text-sm text-neutral-400">
              Aquí podrás cargar logros, premios y estadísticas relevantes para mostrar en tu CV digital.
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
            <span className="rounded-full border border-neutral-800 px-3 py-1">🏆 Campeonatos</span>
            <span className="rounded-full border border-neutral-800 px-3 py-1">⭐ Premios individuales</span>
            <span className="rounded-full border border-neutral-800 px-3 py-1">📈 Estadísticas clave</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Estadísticas por temporada"
        description="Seguimiento agregado de tus números oficiales para compartir con clubes y representantes."
      >
        {publishingState.stats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-800 text-sm text-neutral-300">
              <thead className="bg-neutral-950/60 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Temporada</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Competencia</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Equipo</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">PJ</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Goles</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Asist.</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Minutos</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">TA</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">TR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {publishingState.stats.map((stat) => (
                  <tr key={stat.id} className="bg-neutral-950/40">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">{stat.season}</td>
                    <td className="whitespace-nowrap px-4 py-3">{stat.competition ?? "Competencia pendiente"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{stat.team ?? "Equipo sin definir"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.matches)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.goals)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.assists)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.minutes)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.yellowCards)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.redCards)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-6 text-sm text-neutral-400">
            Cargá tus estadísticas oficiales para potenciar el análisis deportivo. Podrás sincronizarlas con integraciones y
            reportes externos.
          </div>
        )}
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

const HONOUR_DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", { year: "numeric", month: "short" });
const NUMBER_FORMATTER = new Intl.NumberFormat("es-AR");

const LINK_KIND_LABELS: Record<string, string> = {
  highlight: "Video destacado",
  transfermarkt: "Transfermarkt",
  besoccer: "BeSoccer",
  youtube: "YouTube",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

const LINK_KIND_DESCRIPTIONS: Record<string, string> = {
  highlight: "Link utilizado como presentación principal de tu perfil.",
  transfermarkt: "Referencia oficial para valor de mercado y trayectoria.",
  besoccer: "Sincronización con estadísticas verificadas de BeSoccer.",
  youtube: "Canal o playlist con tus mejores jugadas.",
  instagram: "Perfil social para mostrar actualidad y backstage.",
  linkedin: "Perfil profesional orientado a clubes y agentes.",
};

function formatHonourDate(date: string | null): string {
  if (!date) return "Fecha pendiente";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Fecha pendiente";
  return HONOUR_DATE_FORMATTER.format(parsed);
}

function formatNumericStat(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "–";
  return NUMBER_FORMATTER.format(value);
}

function formatLinkKind(kind: string): string {
  return LINK_KIND_LABELS[kind] ?? kind;
}

function getLinkKindDescription(kind: string): string {
  return LINK_KIND_DESCRIPTIONS[kind] ?? "Enlace personalizado sin clasificación.";
}
