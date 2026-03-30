import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { userProfiles } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import AgencyEditForm from "./AgencyEditForm";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";

export const metadata = {
  title: "Mi Agencia - Dashboard",
};

export default async function ManagerAgencyPage() {
  const supa = await createSupabaseServerRSC();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const up = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
    with: { agency: true }
  });

  if (!up || up.role !== "manager" || !up.agencyId || !up.agency) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mi Agencia" description="Información de la agencia representativa." />
        <SectionCard title="Acceso Restringido" description="">
          <p className="text-neutral-400">Aún no tienes una agencia aprobada o no eres un mánager activo.</p>
        </SectionCard>
      </div>
    );
  }

  const { agency } = up;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Perfil de ${agency.name}`}
        description="Actualiza los datos de contacto y la información pública que verán los jugadores."
      />

      <SectionCard
        title="Configuración de Agencia"
        description="Modifica la información general de la empresa."
      >
        <AgencyEditForm agency={agency} />
      </SectionCard>
    </div>
  );
}
