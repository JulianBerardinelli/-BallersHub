import Image from "next/image";
import { redirect } from "next/navigation";
import AvatarUploader from "@/components/dashboard/AvatarUploader";
import FormField from "@/components/dashboard/client/FormField";
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

  const countries = new Map<string, string>();
  (countriesRaw ?? []).forEach((country) => {
    const label = country.name_es ?? country.name_en ?? country.code;
    countries.set(country.code, label);
  });

  function resolveCountryName(code: string | null | undefined, fallback: string | null | undefined) {
    if (code && countries.has(code)) {
      return countries.get(code) ?? fallback ?? "";
    }
    return fallback ?? "";
  }

  const displayFullName = hydratedProfile.full_name ?? "";
  const birthDate = hydratedProfile.birth_date
    ? new Date(hydratedProfile.birth_date).toLocaleDateString()
    : "";
  const nationalityCandidates = Array.isArray(hydratedProfile.nationality)
    ? hydratedProfile.nationality
    : (profileData.nationalityCodes ?? []).map((code) => resolveCountryName(code, code));
  const nationalities = nationalityCandidates.filter((value) => value && value.length > 0).join(", ");
  const heightCm = hydratedProfile.height_cm;
  const weightKg = hydratedProfile.weight_kg;
  const residenceCountryName = resolveCountryName(
    personalDetails?.residence_country_code ?? null,
    personalDetails?.residence_country ?? null,
  );
  const residenceCity = personalDetails?.residence_city ?? "";
  const residence = [residenceCity, residenceCountryName].filter((value) => value && value.trim().length > 0).join(", ");
  const languagesValue = personalDetails?.languages?.join(", ") ?? "";
  const phoneValue = personalDetails?.phone ?? "";
  const documentValue = [personalDetails?.document_type, personalDetails?.document_number]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0)
    .join(" · ");
  const documentCountryName = resolveCountryName(
    personalDetails?.document_country_code ?? null,
    personalDetails?.document_country ?? null,
  );
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
        description="Próximamente podrás editar cada campo y sincronizar la información con tus documentos oficiales."
      >
        <form className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField id="full_name" label="Nombre completo" defaultValue={displayFullName} />
            <FormField id="birth_date" label="Fecha de nacimiento" defaultValue={birthDate} placeholder="dd/mm/aaaa" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              id="nationality"
              label="Nacionalidades"
              defaultValue={nationalities}
              placeholder="Seleccioná una o más nacionalidades"
            />
            <FormField
              id="residence"
              label="Residencia actual"
              defaultValue={residence}
              placeholder="Ciudad, país"
              description="Podrás definir la ubicación que se mostrará en tu perfil."
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              id="height_cm"
              label="Altura (cm)"
              defaultValue={heightCm != null ? String(heightCm) : ""}
              placeholder="Ej: 184"
            />
            <FormField
              id="weight_kg"
              label="Peso (kg)"
              defaultValue={weightKg != null ? String(weightKg) : ""}
              placeholder="Ej: 78"
            />
          </div>
          <FormField
            id="bio"
            as="textarea"
            rows={4}
            label="Biografía breve"
            defaultValue={hydratedProfile.bio ?? ""}
            placeholder="Contá brevemente tu trayectoria y objetivos profesionales."
          />
        </form>
      </SectionCard>

      <SectionCard
        title="Datos de contacto"
        description="Esta información se utilizará para comunicaciones privadas. Podrás decidir qué mostrar de forma pública."
      >
        <form className="grid gap-4 md:grid-cols-2">
          <FormField id="email" label="Email principal" defaultValue={user.email ?? ""} />
          <FormField
            id="phone"
            label="Teléfono de contacto"
            defaultValue={phoneValue}
            placeholder="Próximamente podrás agregar números verificados"
          />
          <FormField
            id="languages"
            label="Idiomas"
            defaultValue={languagesValue}
            placeholder="Ej: Español, Inglés"
            description="Definí los idiomas en los que te pueden contactar."
          />
          <FormField
            id="documents"
            label="Documentación"
            defaultValue={documentValue}
            placeholder="Pasaporte UE, DNI, etc."
            description="Se integrará con verificación documental más adelante."
          />
          <FormField
            id="document_country"
            label="País del documento"
            defaultValue={documentCountryName}
            placeholder="País emisor"
          />
        </form>
      </SectionCard>
    </div>
  );
}
