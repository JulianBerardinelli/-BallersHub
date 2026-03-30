import { redirect } from "next/navigation";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import ManagerProfileForm from "./components/ManagerProfileForm";
import { getManagerProfile } from "@/app/actions/manager-profiles";

export default async function MyProfilePage() {
  const result = await getManagerProfile();

  if (result.error || !result.profile) {
    // If not a manager or no profile, redirect to main dash
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi Perfil"
        description="Gestiona tu información personal, foto y datos de contacto como representante."
      />

      <SectionCard
        title="Datos Personales"
        description="Esta información no está atada a tu agencia. Es propia de tu cuenta como representante."
      >
        <ManagerProfileForm profile={result.profile} />
      </SectionCard>
    </div>
  );
}
