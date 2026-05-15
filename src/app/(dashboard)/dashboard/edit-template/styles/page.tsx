import { redirect } from "next/navigation";
import PageHeader from "@/components/dashboard/client/PageHeader";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import LockedSection from "@/components/dashboard/client/LockedSection";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolveDashboardAccess } from "@/lib/dashboard/client/permissions";
import { fetchDashboardPublishingState } from "@/lib/dashboard/client/publishing-state";
import StylesManagerClient from "./components/StylesManagerClient";
import { db } from "@/lib/db";
import { playerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function TemplateStylesPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard/edit-template/styles");

  const dashboardState = await fetchDashboardState(supabase, user.id);
  const profile = dashboardState.profile;
  const access = resolveDashboardAccess({
    profileStatus: profile?.status ?? null,
    hasProfile: Boolean(profile),
    applicationStatus: dashboardState.application?.status ?? null,
  });

  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Estilos de plantilla"
          description="Configura la apariencia visual de tu página pública y mantené consistencia con tu marca personal."
        />
        {access.templateLock ? <LockedSection {...access.templateLock} /> : null}
      </div>
    );
  }

  if (access.templateLock) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Estilos de plantilla"
          description="Configura la apariencia visual de tu página pública y mantené consistencia con tu marca personal."
        />
        <LockedSection {...access.templateLock} />
      </div>
    );
  }

  const publishingState = await fetchDashboardPublishingState(supabase, profile.id);

  const heroData = await db.query.playerProfiles.findFirst({
    where: eq(playerProfiles.userId, user.id),
    columns: { heroUrl: true }
  });

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Estilos del CV Público"
        description="Selecciona un diseño base, configura la paleta de tu club actual y establece la vibra de tu perfil personal."
      />
      
      <StylesManagerClient initialTheme={publishingState.theme} heroUrl={heroData?.heroUrl} />
    </div>
  );
}
