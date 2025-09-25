import { redirect } from "next/navigation";
import FormField from "@/components/dashboard/client/FormField";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

const TEMPLATE_OPTIONS = [
  {
    id: "classic",
    name: "Clásica",
    description: "Distribución equilibrada con foco en trayectoria y estadísticas.",
  },
  {
    id: "spotlight",
    name: "Spotlight",
    description: "Hero destacado para multimedia y CTA orientado a clubes.",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Diseño limpio centrado en información esencial.",
  },
];

const COLOR_PRESETS = [
  { id: "neutral", label: "Neutro", gradient: "from-neutral-800 via-neutral-900 to-black" },
  { id: "club", label: "Club", gradient: "from-blue-600 via-blue-800 to-black" },
  { id: "energy", label: "Energia", gradient: "from-rose-500 via-fuchsia-600 to-black" },
  { id: "custom", label: "Personalizado", gradient: "from-amber-500 via-orange-600 to-black" },
];

const TYPOGRAPHY_PRESETS = [
  { id: "sans", label: "Sans Serif" },
  { id: "serif", label: "Serif" },
  { id: "condensed", label: "Condensada" },
];

export default async function TemplateStylesPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard/edit-template/styles");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estilos de plantilla"
        description="Configura la apariencia visual de tu página pública y mantené consistencia con tu marca personal."
      />

      <SectionCard
        title="Diseño base"
        description="Elegí la estructura inicial de tu perfil. Luego podrás personalizar bloques y contenidos específicos."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {TEMPLATE_OPTIONS.map((option, index) => (
            <div
              key={option.id}
              className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-950/40 p-5 text-sm text-neutral-300"
            >
              <div className="aspect-[4/3] w-full rounded-lg border border-dashed border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950" />
              <div>
                <p className="text-base font-semibold text-white">{option.name}</p>
                <p className="text-xs text-neutral-400">{option.description}</p>
              </div>
              <span className="text-xs font-medium text-neutral-500">
                {index === 0 ? "Seleccionado por defecto" : "Disponible próximamente"}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Colores principales"
        description="Definí combinaciones cromáticas coherentes con tu marca personal o club."
      >
        <div className="grid gap-4 md:grid-cols-4">
          {COLOR_PRESETS.map((preset, index) => (
            <div
              key={preset.id}
              className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 text-center text-sm text-neutral-200"
            >
              <div className={`mx-auto mb-3 h-20 w-full rounded-md bg-gradient-to-br ${preset.gradient}`} />
              <p className="font-semibold">{preset.label}</p>
              <p className="text-xs text-neutral-500">{index === 0 ? "Actual" : "Preset"}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="primary_color" label="Color primario" placeholder="#141414" />
          <FormField id="accent_color" label="Color de acento" placeholder="#FF5C00" />
        </div>
      </SectionCard>

      <SectionCard
        title="Tipografía y espaciado"
        description="Ajustá estilos tipográficos para alinear tu perfil con materiales de marca existentes."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {TYPOGRAPHY_PRESETS.map((preset, index) => (
            <div
              key={preset.id}
              className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300"
            >
              <p className="text-base font-semibold text-white">{preset.label}</p>
              <p className="text-xs text-neutral-500">
                {index === 0
                  ? "Selección actual"
                  : "Podrás habilitar más opciones tipográficas en futuras iteraciones."}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="heading_scale" label="Escala de títulos" placeholder="1.25" />
          <FormField id="paragraph_spacing" label="Espaciado entre secciones" placeholder="24px" />
        </div>
      </SectionCard>

      <SectionCard
        title="Vista previa"
        description="Simulación del resultado final con los parámetros seleccionados."
        footer="Integración pendiente con el generador de páginas en tiempo real."
      >
        <div className="h-64 w-full rounded-xl border border-neutral-800 bg-neutral-950/40" />
      </SectionCard>
    </div>
  );
}
