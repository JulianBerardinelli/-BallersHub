import { redirect } from "next/navigation";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { userProfiles, agencySectionsVisibility } from "@/db/schema";
import { eq } from "drizzle-orm";
import AgencyStructureManagerClient from "./components/AgencyStructureManagerClient";

export const metadata = {
  title: "Estructura del portfolio · Agencia",
};

export const AGENCY_STRUCTURE_BLOCKS = [
  {
    id: "about",
    label: "Sobre la agencia",
    description: "Bio extendida, stats, licencias y validación oficial.",
    enabledByDefault: true,
  },
  {
    id: "staff",
    label: "Equipo / Staff",
    description: "Mánagers y colaboradores que integran la agencia.",
    enabledByDefault: true,
  },
  {
    id: "roster",
    label: "Roster de jugadores",
    description: "Cartera de futbolistas representados (perfiles públicos).",
    enabledByDefault: true,
  },
  {
    id: "services",
    label: "Servicios",
    description: "Listado de servicios profesionales que ofrece la agencia.",
    enabledByDefault: true,
  },
  {
    id: "reach",
    label: "Alcance global",
    description: "Países donde tu agencia opera o tiene representación.",
    enabledByDefault: true,
  },
  {
    id: "gallery",
    label: "Galería",
    description: "Imágenes de la agencia (oficinas, eventos, equipo). Hasta 5 fotos.",
    enabledByDefault: true,
  },
  {
    id: "contact",
    label: "Contacto",
    description: "Email, teléfono, redes sociales y CTA final.",
    enabledByDefault: true,
  },
] as const;

export default async function AgencyTemplateStructurePage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard/agency/edit-template/structure");

  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
  });

  if (!profile || profile.role !== "manager" || !profile.agencyId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Estructura del portfolio"
          description="Activá o desactivá los bloques de contenido del portfolio público."
        />
        <SectionCard title="Acceso restringido" description="">
          <p className="text-neutral-400">
            Solo los mánagers activos de una agencia pueden editar la plantilla pública.
          </p>
        </SectionCard>
      </div>
    );
  }

  const persisted = await db.query.agencySectionsVisibility.findMany({
    where: eq(agencySectionsVisibility.agencyId, profile.agencyId),
  });

  const blocks = AGENCY_STRUCTURE_BLOCKS.map((block) => {
    const found = persisted.find((p) => p.section === block.id);
    return {
      id: block.id,
      label: block.label,
      description: block.description,
      enabled: found ? found.visible : block.enabledByDefault,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estructura del portfolio público"
        description="Activá o desactivá los bloques de tu portfolio en /agency/[slug]."
      />

      <SectionCard
        title="Bloques disponibles"
        description="Cada toggle se publica al instante en el portfolio público."
      >
        <AgencyStructureManagerClient initialBlocks={blocks} />
      </SectionCard>
    </div>
  );
}
