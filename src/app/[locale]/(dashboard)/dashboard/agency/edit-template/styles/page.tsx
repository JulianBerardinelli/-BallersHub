import { redirect } from "next/navigation";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { userProfiles, agencyThemeSettings, agencyProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import AgencyStylesManagerClient from "./components/AgencyStylesManagerClient";

export const metadata = {
  title: "Estilos del portfolio · Agencia",
};

export default async function AgencyTemplateStylesPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard/agency/edit-template/styles");

  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
  });

  if (!profile || profile.role !== "manager" || !profile.agencyId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Estilos del portfolio de Agencia"
          description="Configura la identidad visual del portfolio público de tu agencia."
        />
        <SectionCard title="Acceso restringido" description="">
          <p className="text-neutral-400">
            Solo los mánagers activos de una agencia pueden editar la plantilla pública.
          </p>
        </SectionCard>
      </div>
    );
  }

  const [agency, theme] = await Promise.all([
    db.query.agencyProfiles.findFirst({
      where: eq(agencyProfiles.id, profile.agencyId),
      columns: { id: true, slug: true, name: true, logoUrl: true },
    }),
    db.query.agencyThemeSettings.findFirst({
      where: eq(agencyThemeSettings.agencyId, profile.agencyId),
    }),
  ]);

  if (!agency) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Estilos del portfolio de Agencia"
          description="Configura la identidad visual del portfolio público de tu agencia."
        />
        <SectionCard title="Agencia no encontrada" description="">
          <p className="text-neutral-400">No se encontró la agencia asociada a tu cuenta.</p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Estilos del portfolio público"
        description="Elegí la plantilla, paleta y tipografía con la que tu agencia se mostrará al mundo."
      />
      <AgencyStylesManagerClient
        agency={agency}
        initialTheme={theme ?? null}
      />
    </div>
  );
}
