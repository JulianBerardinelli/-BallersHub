import { redirect } from "next/navigation";
import { Lock } from "lucide-react";

import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import LockedSection from "@/components/dashboard/client/LockedSection";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolveDashboardAccess } from "@/lib/dashboard/client/permissions";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";

import NationalTeamManager, {
  type NationalTeamStintView,
} from "./components/NationalTeamManager";
import NationalTeamPhotoManager, {
  type NationalTeamPhotoView,
} from "./components/NationalTeamPhotoManager";

export default async function NationalTeamPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard/edit-profile/national-team");

  const dashboardState = await fetchDashboardState(supabase, user.id);
  const profile = dashboardState.profile;
  const access = resolveDashboardAccess({
    profileStatus: profile?.status ?? null,
    hasProfile: Boolean(profile),
    applicationStatus: dashboardState.application?.status ?? null,
  });

  const header = (
    <PageHeader
      title="Selección Nacional"
      description="Tu paso por la selección: categorías, participación, estadísticas y fotos. Lo verificamos antes de publicarlo."
    />
  );

  if (!profile) {
    return (
      <div className="space-y-6">
        {header}
        {access.profileLock ? <LockedSection {...access.profileLock} /> : null}
      </div>
    );
  }

  if (access.profileLock) {
    return (
      <div className="space-y-6">
        {header}
        <LockedSection {...access.profileLock} />
      </div>
    );
  }

  const planAccess = resolvePlanAccess(dashboardState.subscription);
  const isPro = planAccess.isPro;

  const [{ data: rawStints }, { data: rawMedia }, { data: rawCountries }] = await Promise.all([
    supabase
      .from("national_team_stints")
      .select("*")
      .eq("player_id", profile.id)
      .order("order_index", { ascending: true })
      .order("start_year", { ascending: false, nullsFirst: false }),
    supabase
      .from("national_team_media")
      .select("*")
      .eq("player_id", profile.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("countries").select("code, name_es, name_en").order("name_es", { nullsFirst: false }),
  ]);

  const stints: NationalTeamStintView[] = (rawStints ?? []).map((r) => ({
    id: r.id,
    teamId: r.team_id ?? null,
    proposedTeamName: r.proposed_team_name ?? null,
    countryCode: r.country_code ?? null,
    ageCategory: r.age_category,
    participation: r.participation,
    highlights: r.highlights ?? null,
    startYear: r.start_year ?? null,
    endYear: r.end_year ?? null,
    description: r.description ?? null,
    caps: r.caps ?? null,
    goals: r.goals ?? null,
    assists: r.assists ?? null,
    minutes: r.minutes ?? null,
    referenceUrl: r.reference_url ?? null,
    status: r.status,
    resolutionNote: r.resolution_note ?? null,
  }));

  const media: NationalTeamPhotoView[] = (rawMedia ?? []).map((r) => ({
    id: r.id,
    url: r.url,
    altText: r.alt_text ?? null,
    position: r.position ?? 0,
    isApproved: r.is_approved,
    isFlagged: r.is_flagged,
    reviewedBy: r.reviewed_by ?? null,
    createdAt: r.created_at ?? null,
  }));

  const countries = (rawCountries ?? [])
    .map((c) => ({ code: c.code as string, name: (c.name_es ?? c.name_en) as string }))
    .filter((c) => c.code && c.name);

  return (
    <div className="space-y-6">
      {header}

      <SectionCard
        title={
          <span className="inline-flex items-center gap-2">
            Experiencias en selección
            {!isPro && (
              <span className="inline-flex items-center gap-1 rounded-full border border-bh-lime/40 bg-bh-lime/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-bh-lime">
                <Lock size={9} /> Pro
              </span>
            )}
          </span>
        }
        description={
          isPro
            ? "Cargá cada experiencia (categoría, años, tipo de participación y descripción). Cada una pasa por revisión antes de publicarse."
            : "Esta sección es parte del plan Pro. Podés completar tus experiencias, pero para guardarlas y publicarlas en tu perfil necesitás Pro."
        }
      >
        <NationalTeamManager
          playerId={profile.id}
          isPro={isPro}
          stints={stints}
          countries={countries}
        />
      </SectionCard>

      {isPro ? (
        <SectionCard
          title="Fotos con la selección"
          description="Hasta 4 fotos generales de tu paso por la selección. Las revisamos antes de mostrarlas en tu perfil."
        >
          <NationalTeamPhotoManager playerId={profile.id} media={media} />
        </SectionCard>
      ) : null}
    </div>
  );
}
