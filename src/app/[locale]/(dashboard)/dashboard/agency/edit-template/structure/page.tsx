import { redirect } from "next/navigation";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { userProfiles, agencySectionsVisibility } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import AgencyStructureManagerClient from "./components/AgencyStructureManagerClient";

export const metadata = {
  title: "Estructura del portfolio · Agencia",
};

export const AGENCY_STRUCTURE_BLOCKS = [
  { id: "about", enabledByDefault: true },
  { id: "staff", enabledByDefault: true },
  { id: "roster", enabledByDefault: true },
  { id: "services", enabledByDefault: true },
  { id: "reach", enabledByDefault: true },
  { id: "gallery", enabledByDefault: true },
  { id: "contact", enabledByDefault: true },
] as const;

export default async function AgencyTemplateStructurePage() {
  const t = await getTranslations("dashAgency");
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
          title={t("structure.restrictedTitle")}
          description={t("structure.restrictedDescription")}
        />
        <SectionCard title={t("structure.restrictedCardTitle")} description="">
          <p className="text-neutral-400">
            {t("structure.restrictedBody")}
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
      label: t(`structure.blocks.${block.id}.label`),
      description: t(`structure.blocks.${block.id}.description`),
      enabled: found ? found.visible : block.enabledByDefault,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("structure.pageTitle")}
        description={t("structure.pageDescription")}
      />

      <SectionCard
        title={t("structure.blocksTitle")}
        description={t("structure.blocksDescription")}
      >
        <AgencyStructureManagerClient initialBlocks={blocks} />
      </SectionCard>
    </div>
  );
}
