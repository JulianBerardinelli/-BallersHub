import { redirect } from "next/navigation";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import LockedSection from "@/components/dashboard/client/LockedSection";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolveDashboardAccess } from "@/lib/dashboard/client/permissions";
import { fetchDashboardPublishingState } from "@/lib/dashboard/client/publishing-state";
import StructureManagerClient from "./components/StructureManagerClient";

const DEFAULT_STRUCTURE_BLOCKS = [
  {
    id: "hero",
    label: "Hero y presentación",
    description: "Resumen inicial con avatar, datos clave y botón de contacto.",
    enabled: true,
    settings: null,
  },
  {
    id: "stats",
    label: "Estadísticas destacadas",
    description: "Métricas personalizadas o integradas desde fuentes externas.",
    enabled: true,
    settings: null,
  },
  {
    id: "career",
    label: "Trayectoria",
    description: "Cronología de clubes, torneos y temporadas.",
    enabled: true,
    settings: null,
  },
  {
    id: "honours",
    label: "Palmarés",
    description: "Títulos, premios individuales y logros destacados.",
    enabled: true,
    settings: null,
  },
  {
    id: "media",
    label: "Galería multimedia",
    description: "Fotos y videos curados para el perfil público.",
    enabled: true,
    settings: null,
  },
  {
    id: "interviews",
    label: "Entrevistas y prensa",
    description: "Bloque opcional para notas destacadas en medios.",
    enabled: false,
    settings: null,
  },
  {
    id: "contact",
    label: "Datos de contacto",
    description: "Información para agentes, clubes y prensa.",
    enabled: true,
    settings: null,
  },
];

const SECTION_COPY: Record<string, { label: string; description: string }> = {
  hero: {
    label: "Hero y presentación",
    description: "Resumen inicial con avatar, datos clave y botón de contacto.",
  },
  stats: {
    label: "Estadísticas destacadas",
    description: "Métricas personalizadas o integradas desde fuentes externas.",
  },
  career: {
    label: "Trayectoria",
    description: "Cronología de clubes, torneos y temporadas.",
  },
  honours: {
    label: "Palmarés",
    description: "Títulos, premios individuales y logros destacados.",
  },
  media: {
    label: "Galería multimedia",
    description: "Fotos y videos curados para el perfil público.",
  },
  interviews: {
    label: "Entrevistas y prensa",
    description: "Bloque opcional para notas destacadas en medios.",
  },
  contact: {
    label: "Datos de contacto",
    description: "Información para agentes, clubes y prensa.",
  },
};

const DEFAULT_ORDER_PREVIEW = [
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
        {access.templateLock ? <LockedSection {...access.templateLock} /> : null}
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

  const publishingState = await fetchDashboardPublishingState(supabase, profile.id);
  const sectionVisibility = publishingState.sections;
  const theme = publishingState.theme;

  const structureBlocks = sectionVisibility.length > 0
    ? sectionVisibility.map((section) => {
        const metadata = resolveSectionMetadata(section.section);
        return {
          id: section.section,
          label: metadata.label,
          description: metadata.description,
          enabled: section.visible,
          settings: section.settings,
        };
      })
    : DEFAULT_STRUCTURE_BLOCKS;

  const orderPreview = sectionVisibility.length > 0
    ? sectionVisibility.map((section) => resolveSectionMetadata(section.section).label)
    : DEFAULT_ORDER_PREVIEW;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estructura de la plantilla"
        description="Activá, desactivá y ordená bloques de contenido para adaptar tu página pública a diferentes escenarios."
      />

      <SectionCard
        title="Tema y estilo"
        description="Definí layout, colores y estilo visual de tu perfil público."
      >
        {theme ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 text-sm text-neutral-300">
              <p>
                <span className="text-neutral-500">Layout:</span> {formatLayoutLabel(theme.layout)}
              </p>
              <p>
                <span className="text-neutral-500">Modo de portada:</span> {formatCoverModeLabel(theme.coverMode)}
              </p>
              <p className="text-xs text-neutral-500">
                Última actualización: {formatUpdatedAt(theme.updatedAt ?? theme.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ColorSwatch label="Primario" value={theme.primaryColor} />
              <ColorSwatch label="Secundario" value={theme.accentColor} />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-6 text-sm text-neutral-400">
            Aún no configuraste la temática de tu perfil. Pronto podrás elegir layout, paleta y tipografía desde esta sección.
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Bloques disponibles"
        description="Configurá qué secciones estarán visibles según tu perfil y objetivos."
      >
        <StructureManagerClient initialBlocks={structureBlocks} />
      </SectionCard>

      <SectionCard
        title="Orden de secciones"
        description="Definí la jerarquía de información arrastrando y soltando bloques."
        footer="Integración pendiente con sistema de drag & drop y persistencia por perfil."
      >
        <ol className="space-y-2 text-sm text-neutral-300">
          {orderPreview.map((item, index) => (
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

const LAYOUT_LABELS: Record<string, string> = {
  free: "Free Editorial",
  pro: "Pro Athlete (3D)",
};

const COVER_MODE_LABELS: Record<string, string> = {
  photo: "Fotografía",
  video: "Video",
  gradient: "Gradiente",
};

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function resolveSectionMetadata(section: string) {
  return SECTION_COPY[section] ?? {
    label: formatSectionIdentifier(section),
    description: "Configuración personalizada.",
  };
}

function formatSectionIdentifier(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function summarizeSectionSettings(settings: Record<string, unknown> | null | undefined): string | null {
  if (!settings || Object.keys(settings).length === 0) return null;
  const parts = Object.entries(settings).map(([key, value]) => {
    return `${formatSectionIdentifier(key)}: ${formatSettingValue(value)}`;
  });
  return parts.join(" · ");
}

function formatSettingValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => formatSettingValue(item)).join(", ");
  if (value === null || value === undefined) return "–";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => `${formatSectionIdentifier(key)}: ${formatSettingValue(val)}`)
      .join(", ");
    return `{ ${entries} }`;
  }
  return String(value);
}

function formatLayoutLabel(layout: string): string {
  return LAYOUT_LABELS[layout] ?? formatSectionIdentifier(layout);
}

function formatCoverModeLabel(mode: string | null): string {
  if (!mode) return "Automático";
  return COVER_MODE_LABELS[mode] ?? formatSectionIdentifier(mode);
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return TIMESTAMP_FORMATTER.format(parsed);
}

type ColorSwatchProps = {
  label: string;
  value: string | null;
};

function ColorSwatch({ label, value }: ColorSwatchProps) {
  const fallback = "#1f2937";
  const hex = typeof value === "string" && value.trim().length > 0 ? value : fallback;
  const normalized = hex.startsWith("#") ? hex.toUpperCase() : hex;

  return (
    <div className="flex flex-col items-center gap-2 text-xs text-neutral-400">
      <div
        aria-hidden="true"
        className="h-12 w-12 rounded-full border border-neutral-800 shadow-inner"
        style={{ backgroundColor: hex }}
      />
      <span className="font-medium text-white">{label}</span>
      <span className="text-[10px] uppercase tracking-wide text-neutral-500">{normalized}</span>
    </div>
  );
}
