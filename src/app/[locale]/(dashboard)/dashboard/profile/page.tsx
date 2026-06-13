import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import ManagerProfileForm from "./components/ManagerProfileForm";
import ManagerLicensesSection from "./components/ManagerLicensesSection";
import { getManagerProfile } from "@/app/actions/manager-profiles";

export async function generateMetadata() {
  const t = await getTranslations("dashAgency");
  return { title: t("managerProfile.metaTitle") };
}

export default async function MyProfilePage() {
  const t = await getTranslations("dashAgency");
  const result = await getManagerProfile();

  if (result.error || !result.profile) {
    redirect("/dashboard");
  }

  const licenses = (result.profile.licenses as Array<{ type: string; number: string; url?: string }> | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("managerProfile.pageTitle")}
        description={t("managerProfile.pageDescription")}
      />

      <SectionCard
        title={t("managerProfile.personalDataTitle")}
        description={t("managerProfile.personalDataDescription")}
      >
        <ManagerProfileForm profile={result.profile} />
      </SectionCard>

      <ManagerLicensesSection initialLicenses={licenses} />
    </div>
  );
}
