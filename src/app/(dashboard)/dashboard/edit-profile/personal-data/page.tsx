import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import AvatarUploader from "@/components/dashboard/AvatarUploader";
import FormField from "@/components/dashboard/client/FormField";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import TaskCalloutList from "@/components/dashboard/client/TaskCalloutList";
import { fetchPlayerTaskMetrics } from "@/lib/dashboard/client/metrics";
import {
  buildTaskContext,
  getPendingTasksForSection,
  type TaskProfileSnapshot,
} from "@/lib/dashboard/client/task-context";
import { evaluateDashboardTasks, orderTasksBySeverity } from "@/lib/dashboard/client/tasks";
import {
  coerceNotesDate,
  coerceNotesNumber,
  parseApplicationNotes,
  pickFirstPresent,
} from "@/lib/dashboard/client/profile-data";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

type PersonalProfile = TaskProfileSnapshot & {
  updated_at: string | null;
};

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

  const [profileResult, applicationResult] = await Promise.all([
    supabase
      .from("player_profiles")
      .select(
        "id, status, slug, visibility, full_name, avatar_url, birth_date, nationality, positions, current_club, bio, foot, height_cm, weight_kg, updated_at",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("player_applications")
      .select("id, full_name, nationality, positions, current_club, transfermarkt_url, external_profile_url, notes, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profileRaw = profileResult.data;
  const applicationRaw = applicationResult.data;

  const profile = (profileRaw as PersonalProfile | null) ?? null;
  const application = (applicationRaw as PlayerApplicationSnapshot | null) ?? null;

  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Datos personales"
          description="Creá tu perfil para habilitar la edición de datos personales."
        />
        <SectionCard
          title="Sin perfil de jugador"
          description="Completá el onboarding para comenzar a cargar tu información personal."
        >
          <p className="text-sm text-neutral-300">
            No encontramos un perfil asociado a tu cuenta. Iniciá el proceso desde el{' '}
            <Link href="/onboarding/start" className="text-primary underline">
              onboarding
            </Link>{' '}
            para generar tu ficha profesional.
          </p>
        </SectionCard>
      </div>
    );
  }

  const metrics = await fetchPlayerTaskMetrics(supabase, profile.id);

  const normalizedProfile: TaskProfileSnapshot = {
    id: profile.id,
    status: profile.status,
    slug: profile.slug ?? null,
    visibility: profile.visibility,
    full_name: profile.full_name ?? null,
    birth_date: profile.birth_date ?? null,
    nationality: profile.nationality ?? null,
    positions: profile.positions ?? null,
    current_club: profile.current_club ?? null,
    bio: profile.bio ?? null,
    avatar_url: profile.avatar_url ?? null,
    foot: profile.foot ?? null,
    height_cm: profile.height_cm ?? null,
    weight_kg: profile.weight_kg ?? null,
  };

  const taskEvaluation = evaluateDashboardTasks(buildTaskContext(normalizedProfile, metrics));
  const pendingTasks = orderTasksBySeverity(getPendingTasksForSection(taskEvaluation, "personal-data"));
  const taskCallouts = pendingTasks.map((task) => ({
    id: task.id,
    severity: task.severity,
    title: task.title,
    description: task.description,
    href: task.href,
  }));

  const applicationNotes = parseApplicationNotes(application?.notes ?? null);
  const displayFullName = pickFirstPresent(profile.full_name, application?.full_name) ?? "";
  const birthDateSource = pickFirstPresent(
    profile.birth_date,
    coerceNotesDate(applicationNotes?.birth_date),
  );
  const birthDate = birthDateSource ? new Date(birthDateSource).toLocaleDateString() : "";
  const nationalityList = pickFirstPresent(profile.nationality, application?.nationality) ?? [];
  const nationalities = Array.isArray(nationalityList) ? nationalityList.join(", ") : String(nationalityList);
  const heightCm = pickFirstPresent(profile.height_cm, coerceNotesNumber(applicationNotes?.height_cm));
  const weightKg = pickFirstPresent(profile.weight_kg, coerceNotesNumber(applicationNotes?.weight_kg));

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
              src={profile.avatar_url ?? "/images/player-default.png"}
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
            <AvatarUploader playerId={profile.id} />
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
            defaultValue={profile.bio ?? ""}
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
            placeholder="Próximamente podrás agregar números verificados"
          />
          <FormField
            id="languages"
            label="Idiomas"
            placeholder="Ej: Español, Inglés"
            description="Definí los idiomas en los que te pueden contactar."
          />
          <FormField
            id="documents"
            label="Documentación"
            placeholder="Pasaporte UE, DNI, etc."
            description="Se integrará con verificación documental más adelante."
          />
        </form>
      </SectionCard>
    </div>
  );
}
