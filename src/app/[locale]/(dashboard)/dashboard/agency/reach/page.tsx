import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { db } from "@/lib/db";
import { agencyCountryProfiles } from "@/db/schema";
import PageHeader from "@/components/dashboard/client/PageHeader";
import { requireManagerAgency } from "../_lib/require-manager-agency";
import AgencyRestricted from "../_lib/AgencyRestricted";
import OperativeReachSection from "../components/lazy/OperativeReachSectionLazy";
import CountriesSection from "../components/lazy/CountriesSectionLazy";

export async function generateMetadata() {
  const t = await getTranslations("dashAgency");
  return { title: t("reachPage.metaTitle") };
}

// Alcance + narrativas por país van juntas: CountriesSection usa
// `operativeCountries` (lo que edita OperativeReachSection) como fuente de qué
// editores por país renderizar.
export default async function AgencyReachPage() {
  const ctx = await requireManagerAgency();
  if (!ctx) return <AgencyRestricted />;
  const { agency } = ctx;
  const t = await getTranslations("dashAgency");

  const countryProfiles = await db.query.agencyCountryProfiles.findMany({
    where: eq(agencyCountryProfiles.agencyId, agency.id),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("reachPage.pageTitle")}
        description={t("reachPage.pageDescription")}
      />
      <OperativeReachSection
        agencyId={agency.id}
        agencyName={agency.name}
        initialCountries={agency.operativeCountries ?? []}
      />
      <CountriesSection
        agencyName={agency.name}
        operativeCountries={agency.operativeCountries ?? []}
        initialProfiles={countryProfiles.map((p) => ({
          countryCode: p.countryCode,
          description: p.description,
        }))}
      />
    </div>
  );
}
