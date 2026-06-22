import { getTranslations } from "next-intl/server";

import PageHeader from "@/components/dashboard/client/PageHeader";
import { requireManagerAgency } from "./_lib/require-manager-agency";
import AgencyRestricted from "./_lib/AgencyRestricted";
import IdentitySection from "./components/IdentitySection";
import GeneralInfoSection from "./components/GeneralInfoSection";
import ContactSocialSection from "./components/lazy/ContactSocialSectionLazy";

export async function generateMetadata() {
  const t = await getTranslations("dashAgency");
  return { title: t("page.metaTitle") };
}

// Datos principales: identidad + información general + contacto. El resto del
// perfil (servicios, alcance, clubes, multimedia, idiomas) vive en sub-rutas
// hermanas; ver la sección "Agencia" en navigation.ts.
export default async function ManagerAgencyPage() {
  const ctx = await requireManagerAgency();
  if (!ctx) return <AgencyRestricted />;
  const { agency } = ctx;
  const t = await getTranslations("dashAgency");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.headerTitle", { name: agency.name })}
        description={t("page.headerDescription")}
      />

      <IdentitySection
        agencyId={agency.id}
        initialLogoUrl={agency.logoUrl}
        initialValues={{
          name: agency.name ?? "",
          slug: agency.slug ?? "",
          tagline: agency.tagline ?? "",
        }}
      />

      <GeneralInfoSection
        agencyId={agency.id}
        agencyName={agency.name}
        initialValues={{
          headquarters: agency.headquarters ?? "",
          foundationYear: agency.foundationYear ? agency.foundationYear.toString() : "",
          description: agency.description ?? "",
        }}
      />

      <ContactSocialSection
        agencyId={agency.id}
        agencyName={agency.name}
        initialValues={{
          contactEmail: agency.contactEmail ?? "",
          contactPhone: agency.contactPhone ?? "",
          websiteUrl: agency.websiteUrl ?? "",
          verifiedLink: agency.verifiedLink ?? "",
          instagramUrl: agency.instagramUrl ?? "",
          twitterUrl: agency.twitterUrl ?? "",
          linkedinUrl: agency.linkedinUrl ?? "",
        }}
      />
    </div>
  );
}
