import { redirect } from "next/navigation";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import ManagerProfileForm from "./components/ManagerProfileForm";
import ManagerLicensesSection from "./components/ManagerLicensesSection";
import { getManagerProfile } from "@/app/actions/manager-profiles";

export default async function MyProfilePage() {
  const result = await getManagerProfile();

  if (result.error || !result.profile) {
    redirect("/dashboard");
  }

  const licenses = (result.profile.licenses as Array<{ type: string; number: string; url?: string }> | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi Perfil"
        description="Gestioná tu información personal, foto, datos de contacto y licencias como representante."
      />

      <SectionCard
        title="Datos personales"
        description="Esta información no está atada a tu agencia. Es propia de tu cuenta como representante."
      >
        <ManagerProfileForm profile={result.profile} />
      </SectionCard>

      <ManagerLicensesSection initialLicenses={licenses} />
    </div>
  );
}
