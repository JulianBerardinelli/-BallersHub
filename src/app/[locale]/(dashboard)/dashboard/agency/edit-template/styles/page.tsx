import { redirect } from "next/navigation";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { userProfiles, agencyThemeSettings, agencyProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import AgencyStylesManagerClient from "./components/AgencyStylesManagerClient";

export const metadata = {
  title: "Estilos del portfolio · Agencia",
};

export default async function AgencyTemplateStylesPage() {
  const t = await getTranslations("dashAgency");
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
          title={t("styles.restrictedTitle")}
          description={t("styles.restrictedDescription")}
        />
        <SectionCard title={t("styles.restrictedCardTitle")} description="">
          <p className="text-neutral-400">
            {t("styles.restrictedBody")}
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
          title={t("styles.restrictedTitle")}
          description={t("styles.restrictedDescription")}
        />
        <SectionCard title={t("styles.notFoundCardTitle")} description="">
          <p className="text-neutral-400">{t("styles.notFoundBody")}</p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title={t("styles.pageTitle")}
        description={t("styles.pageDescription")}
      />
      <AgencyStylesManagerClient
        agency={agency}
        initialTheme={theme ?? null}
      />
    </div>
  );
}
