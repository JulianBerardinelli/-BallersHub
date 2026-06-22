import { getTranslations } from "next-intl/server";

import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";

/**
 * Friendly "no agency yet" state shared by every agency dashboard sub-route,
 * shown when `requireManagerAgency()` returns null (user is logged in but isn't
 * an approved manager with an agency).
 */
export default async function AgencyRestricted() {
  const t = await getTranslations("dashAgency");
  return (
    <div className="space-y-6">
      <PageHeader title={t("restricted.title")} description={t("restricted.description")} />
      <SectionCard title={t("restricted.cardTitle")} description="">
        <p className="text-bh-fg-3">{t("restricted.body")}</p>
      </SectionCard>
    </div>
  );
}
