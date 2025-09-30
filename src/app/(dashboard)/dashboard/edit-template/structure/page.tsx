import { redirect } from "next/navigation";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import LockedSection from "@/components/dashboard/client/LockedSection";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolveDashboardAccess } from "@/lib/dashboard/client/permissions";

const STRUCTURE_BLOCKS = [
  {
    id: "hero",
    label: "Hero y presentación",
    description: "Resumen inicial con avatar, datos clave y botón de contacto.",
    enabled: true,
  },
  {
    id: "stats",
    label: "Estadísticas destacadas",
    description: "Métricas personalizadas o integradas desde fuentes externas.",
    enabled: true,
  },
  {
    id: "career",
    label: "Trayectoria",
    description: "Cronología de clubes, torneos y temporadas.",
    enabled: true,
  },
  {
    id: "honours",
    label: "Palmarés",
    description: "Títulos, premios individuales y logros destacados.",
    enabled: true,
  },
  {
    id: "media",
    label: "Galería multimedia",
    description: "Fotos y videos curados para el perfil público.",
    enabled: true,
  },
  {
    id: "interviews",
    label: "Entrevistas y prensa",
    description: "Bloque opcional para notas destacadas en medios.",
    enabled: false,
  },
  {
    id: "contact",
    label: "Datos de contacto",
    description: "Información para agentes, clubes y prensa.",
    enabled: true,
  },
];

const ORDER_PREVIEW = [
  "Hero y presentación",
  "Datos personales",
  "Trayectoria",
  "Palmarés",
  "Multimedia",
  "Entrevistas",
  "Contacto",
];

export default async function TemplateStructurePage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard/edit-template/structure");

  const dashboardState = await fetchDashboardState(supabase, user.id);
  const profile = dashboardState.profile;
  const access = resolveDashboardAccess({
    profileStatus: profile?.status ?? null,
    hasProfile: Boolean(profile),
    applicationStatus: dashboardState.application?.status ?? null,
  });

  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Estructura de la plantilla"
          description="Activá, desactivá y ordená bloques de contenido para adaptar tu página pública a diferentes escenarios."
        />
        <LockedSection
          title="Bloques no disponibles"
          description="Creá y aprobá tu perfil de jugador para personalizar qué secciones se publican en tu CV."
          action={{ label: "Completar perfil", href: "/onboarding/start", tone: "primary" }}
        />
      </div>
    );
  }

  if (access.templateLock) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Estructura de la plantilla"
          description="Activá, desactivá y ordená bloques de contenido para adaptar tu página pública a diferentes escenarios."
        />
        <LockedSection {...access.templateLock} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estructura de la plantilla"
        description="Activá, desactivá y ordená bloques de contenido para adaptar tu página pública a diferentes escenarios."
      />

      <SectionCard
        title="Bloques disponibles"
        description="Configurá qué secciones estarán visibles según tu perfil y objetivos."
      >
        <div className="space-y-4">
          {STRUCTURE_BLOCKS.map((block) => (
            <label
              key={block.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4"
            >
              <div>
                <p className="text-sm font-semibold text-white">{block.label}</p>
                <p className="text-xs text-neutral-400">{block.description}</p>
              </div>
              <input
                type="checkbox"
                defaultChecked={block.enabled}
                disabled
                className="mt-1 h-5 w-5 cursor-not-allowed rounded border-neutral-700 bg-neutral-900 text-primary"
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-neutral-500">
          Próximamente se podrán definir reglas condicionales (por ejemplo, mostrar entrevistas solo si existen registros cargados).
        </p>
      </SectionCard>

      <SectionCard
        title="Orden de secciones"
        description="Definí la jerarquía de información arrastrando y soltando bloques."
        footer="Integración pendiente con sistema de drag & drop y persistencia por perfil."
      >
        <ol className="space-y-2 text-sm text-neutral-300">
          {ORDER_PREVIEW.map((item, index) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 px-4 py-3"
            >
              <span className="rounded-md bg-neutral-900 px-2 py-1 text-xs text-neutral-500">{index + 1}</span>
              <span>{item}</span>
              <span className="ml-auto text-xs text-neutral-500">Arrastrar</span>
            </li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard
        title="Condicionales avanzados"
        description="Prepará la lógica de visibilidad según el tipo de perfil o plan contratado."
      >
        <div className="space-y-3 text-sm text-neutral-300">
          <p>
            Próximamente podrás definir reglas como “mostrar palmarés solo si existe información” o “ocultar datos de contacto para perfiles gratuitos”.
          </p>
          <p className="text-xs text-neutral-500">
            Estas configuraciones se integrarán con subscripciones y roles (jugador, representante, staff) para habilitar experiencias dinámicas.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
