import { getTranslations } from "next-intl/server";

import PageHeader from "@/components/dashboard/client/PageHeader";
import { requireManagerAgency } from "../_lib/require-manager-agency";
import AgencyRestricted from "../_lib/AgencyRestricted";
import { normalizeAgencyServices } from "../_lib/normalize-services";
import ServicesSection from "../components/lazy/ServicesSectionLazy";

export async function generateMetadata() {
  const t = await getTranslations("dashAgency");
  return { title: t("servicesPage.metaTitle") };
}

export default async function AgencyServicesPage() {
  const ctx = await requireManagerAgency();
  if (!ctx) return <AgencyRestricted />;
  const { agency } = ctx;
  const t = await getTranslations("dashAgency");

  const normalizedServices = normalizeAgencyServices((agency.services ?? []) as unknown[]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("servicesPage.pageTitle")}
        description={t("servicesPage.pageDescription")}
      />
      <ServicesSection
        agencyId={agency.id}
        agencyName={agency.name}
        initialServices={normalizedServices}
      />
    </div>
  );
}
