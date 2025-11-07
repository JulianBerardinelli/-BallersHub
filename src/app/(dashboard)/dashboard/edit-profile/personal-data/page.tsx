import Image from "next/image";
import { redirect } from "next/navigation";
import AvatarUploader from "@/components/dashboard/AvatarUploader";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import TaskCalloutList from "@/components/dashboard/client/TaskCalloutList";
import LockedSection from "@/components/dashboard/client/LockedSection";
import { fetchPlayerTaskMetrics } from "@/lib/dashboard/client/metrics";
import {
  buildTaskContext,
  getPendingTasksForSection,
  type TaskProfileSnapshot,
} from "@/lib/dashboard/client/task-context";
import { evaluateDashboardTasks, orderTasksBySeverity } from "@/lib/dashboard/client/tasks";
import { hydrateTaskProfileSnapshot } from "@/lib/dashboard/client/profile-data";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolveDashboardAccess } from "@/lib/dashboard/client/permissions";
import BasicInfoForm, { type CountryOption } from "./components/BasicInfoForm";
import ContactInfoForm from "./components/ContactInfoForm";

type PlayerApplicationSnapshot = {
  id: string;
  full_name: string | null;
  nationality: string[] | null;
  positions: string[] | null;
  current_club: string | null;
  transfermarkt_url: string | null;
  external_profile_url: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

export default async function PersonalDataPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard/edit-profile/personal-data");

  const dashboardState = await fetchDashboardState(supabase, user.id);

  const profileData = dashboardState.profile;
  const applicationData = dashboardState.application;
  const personalDetails = dashboardState.personalDetails;

  const access = resolveDashboardAccess({
    profileStatus: profileData?.status ?? null,
    hasProfile: Boolean(profileData),
    applicationStatus: applicationData?.status ?? null,
  });

  if (!profileData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Datos personales"
          description="Creá tu perfil para habilitar la edición de datos personales."
        />
        {access.profileLock ? <LockedSection {...access.profileLock} /> : null}
      </div>
    );
  }

  if (access.profileLock) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Datos personales"
          description="Gestioná tu información básica y de contacto. Estos datos se utilizarán para tu perfil público y comunicaciones."
        />
        <LockedSection {...access.profileLock} />
      </div>
    );
  }

  const metrics = await fetchPlayerTaskMetrics(supabase, profileData.id);

  const normalizedProfile: TaskProfileSnapshot = {
    id: profileData.id,
    status: profileData.status,
    slug: profileData.slug ?? null,
    visibility: profileData.visibility,
    full_name: profileData.full_name ?? null,
    birth_date: profileData.birth_date ?? null,
    nationality: profileData.nationality ?? null,
    positions: profileData.positions ?? null,
    current_club: profileData.current_club ?? null,
    bio: profileData.bio ?? null,
    avatar_url: profileData.avatar_url ?? dashboardState.primaryPhotoUrl ?? null,
    foot: profileData.foot ?? null,
    height_cm: profileData.height_cm ?? null,
    weight_kg: profileData.weight_kg ?? null,
  };

  const application: PlayerApplicationSnapshot | null = applicationData
    ? {
        id: applicationData.id,
        full_name: applicationData.full_name ?? null,
        nationality: applicationData.nationality ?? null,
        positions: applicationData.positions ?? null,
        current_club: applicationData.current_club ?? null,
        transfermarkt_url: applicationData.transfermarkt_url ?? null,
        external_profile_url: applicationData.external_profile_url ?? null,
        notes: applicationData.notes ?? null,
        status: applicationData.status ?? null,
        created_at: applicationData.created_at ?? null,
      }
    : null;

  const hydratedProfile =
    hydrateTaskProfileSnapshot(normalizedProfile, application ?? null) ?? normalizedProfile;

  const taskEvaluation = evaluateDashboardTasks(buildTaskContext(hydratedProfile, metrics));
  const pendingTasks = orderTasksBySeverity(getPendingTasksForSection(taskEvaluation, "personal-data"));
  const taskCallouts = pendingTasks.map((task) => ({
    id: task.id,
    severity: task.severity,
    title: task.title,
    description: task.description,
    href: task.href,
  }));

  const { data: countriesRaw } = await supabase
    .from("countries")
    .select("code, name_es, name_en");

  const countryOptions: CountryOption[] = (countriesRaw ?? []).map((country) => ({
    code: country.code,
    name: country.name_es ?? country.name_en ?? country.code,
  }));

  const birthDateValue = typeof profileData.birth_date === "string"
    ? profileData.birth_date.slice(0, 10)
    : null;
  const avatarUrl = normalizedProfile.avatar_url ?? "/images/player-default.png";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Datos personales"
        description="Gestioná tu información básica y de contacto. Estos datos se utilizarán para tu perfil público y comunicaciones."
      />

      <TaskCalloutList tasks={taskCallouts} />

      <SectionCard
        title="Avatar e identidad"
        description="Actualizá tu foto y datos principales para mantener tu perfil profesional coherente."
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="relative size-24 overflow-hidden rounded-lg border border-neutral-800">
            <Image
              src={avatarUrl}
              alt="Avatar actual"
              fill
              sizes="96px"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex-1 space-y-4">
            <p className="text-sm text-neutral-300">
              Utilizá una imagen en alta resolución, formato cuadrado. Las imágenes se utilizarán en tu CV automatizado y perfil público.
            </p>
            <AvatarUploader playerId={profileData.id} currentAvatarUrl={avatarUrl} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Información básica"
        description="Actualizá tus datos personales clave para mantener tu perfil consistente y listo para revisión."
      >
        <BasicInfoForm
          playerId={profileData.id}
          fullName={profileData.full_name ?? ""}
          birthDate={birthDateValue}
          nationalityCodes={profileData.nationalityCodes ?? []}
          residenceCity={personalDetails?.residence_city ?? null}
          residenceCountryCode={personalDetails?.residence_country_code ?? null}
          heightCm={profileData.height_cm}
          weightKg={profileData.weight_kg}
          bio={profileData.bio}
          countries={countryOptions}
        />
      </SectionCard>

      <SectionCard
        title="Datos de contacto"
        description="Definí cómo querés que te contacten y mantené tu documentación personal actualizada."
      >
        <ContactInfoForm
          playerId={profileData.id}
          email={user.email ?? null}
          phone={personalDetails?.phone ?? null}
          languages={personalDetails?.languages ?? null}
          documentType={personalDetails?.document_type ?? null}
          documentNumber={personalDetails?.document_number ?? null}
          documentCountryCode={personalDetails?.document_country_code ?? null}
          countries={countryOptions}
        />
      </SectionCard>
    </div>
  );
}
