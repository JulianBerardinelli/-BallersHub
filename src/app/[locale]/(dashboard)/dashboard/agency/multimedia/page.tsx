import { eq, asc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { db } from "@/lib/db";
import { agencyMedia } from "@/db/schema";
import PageHeader from "@/components/dashboard/client/PageHeader";
import { requireManagerAgency } from "../_lib/require-manager-agency";
import AgencyRestricted from "../_lib/AgencyRestricted";
import AgencyMediaManagerClient from "../components/lazy/AgencyMediaManagerClientLazy";

export async function generateMetadata() {
  const t = await getTranslations("dashAgency");
  return { title: t("multimediaPage.metaTitle") };
}

export default async function AgencyMultimediaPage() {
  const ctx = await requireManagerAgency();
  if (!ctx) return <AgencyRestricted />;
  const { agency } = ctx;
  const t = await getTranslations("dashAgency");

  const media = await db.query.agencyMedia.findMany({
    where: eq(agencyMedia.agencyId, agency.id),
    orderBy: asc(agencyMedia.position),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("multimediaPage.pageTitle")}
        description={t("multimediaPage.pageDescription")}
      />
      <AgencyMediaManagerClient
        agencyId={agency.id}
        media={media.map((m) => ({
          id: m.id,
          url: m.url,
          title: m.title,
          altText: m.altText,
          createdAt: m.createdAt,
        }))}
        agencyContext={{
          name: agency.name,
          headquarters: agency.headquarters,
          operativeCountries: agency.operativeCountries,
        }}
      />
    </div>
  );
}
