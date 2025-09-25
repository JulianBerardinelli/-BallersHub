import Link from "next/link";
import { redirect } from "next/navigation";
import FormField from "@/components/dashboard/client/FormField";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

export default async function MultimediaPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard/edit-profile/multimedia");

  const { data: profileRaw } = await supabase
    .from("player_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const profile = (profileRaw as { id: string } | null) ?? null;

  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Multimedia"
          description="Creá tu perfil para gestionar galerías, videos y notas de prensa."
        />
        <SectionCard
          title="Sin acceso a multimedia"
          description="Completá el onboarding para habilitar la carga de archivos e integración con prensa."
        >
          <p className="text-sm text-neutral-300">
            Una vez que generes tu perfil de jugador, podrás organizar imágenes y videos para tu CV automático. Iniciá el{' '}
            <Link href="/onboarding/start" className="text-primary underline">
              onboarding
            </Link>{' '}
            para continuar.
          </p>
        </SectionCard>
      </div>
    );
  }

  const placeholderPhotos = Array.from({ length: 6 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Multimedia"
        description="Centralizá imágenes, videos y artículos destacados para potenciar tu presencia digital."
      />

      <SectionCard
        title="Galería fotográfica"
        description="Estas imágenes se utilizarán para tu CV automático y futuras activaciones promocionales."
        footer="Podrás definir portada, orden y derechos de uso por imagen."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {placeholderPhotos.map((_, index) => (
            <div
              key={index}
              className="flex h-40 items-center justify-center rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 text-sm text-neutral-500"
            >
              {index === 0 ? 'Subir foto principal' : 'Espacio reservado'}
            </div>
          ))}
        </div>
        <p className="text-xs text-neutral-400">
          Próximamente podrás arrastrar y soltar archivos, generar versiones optimizadas y etiquetar fotógrafos.
        </p>
      </SectionCard>

      <SectionCard
        title="Videos y highlights"
        description="Organizá contenido audiovisual para reclutadores y prensa."
      >
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-white">Highlight #{item}</p>
                  <p className="text-xs text-neutral-400">Descripción breve y etiquetas relevantes.</p>
                </div>
                <span className="text-xs text-neutral-500">Duración estimada: 00:00</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-neutral-400">
          Podrás vincular videos de YouTube, Vimeo u otras plataformas, asignar miniaturas personalizadas y definir orden de aparición.
        </p>
      </SectionCard>

      <SectionCard
        title="Notas de prensa y artículos"
        description="Mantén actualizado tu repositorio de noticias, entrevistas y apariciones en medios."
      >
        <div className="space-y-3">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-400"
            >
              <p className="font-semibold text-white">Artículo destacado #{item}</p>
              <p className="text-xs text-neutral-500">
                Espacio reservado para título, medio, fecha y enlace original.
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-neutral-400">
          En esta sección podrás cargar notas manualmente o sincronizarlas mediante integraciones con medios deportivos.
        </p>
      </SectionCard>

      <SectionCard
        title="Metadatos y categorización"
        description="Definí etiquetas para organizar tu biblioteca y acelerar búsquedas internas."
      >
        <form className="grid gap-4 md:grid-cols-2">
          <FormField id="tags" label="Etiquetas" placeholder="Ej: Presentación, Pretemporada, Selección" />
          <FormField
            id="copyright"
            label="Derechos"
            placeholder="Créditos y restricciones de uso"
          />
          <FormField
            id="description"
            as="textarea"
            rows={3}
            label="Descripción general"
            placeholder="Notas sobre el uso del material multimedia."
          />
          <FormField
            id="visibility"
            label="Visibilidad multimedia"
            placeholder="Público, privado, solo enlaces"
          />
        </form>
      </SectionCard>
    </div>
  );
}
