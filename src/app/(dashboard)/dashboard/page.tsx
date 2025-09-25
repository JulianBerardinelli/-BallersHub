import Link from "next/link";
import { redirect } from "next/navigation";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

type PlayerOverview = {
  id: string;
  status: string;
  slug: string | null;
  visibility: string;
};

type ApplicationOverview = {
  status: string;
  created_at: string;
};

const NEXT_STEPS = [
  {
    id: "personal-data",
    title: "Actualizar datos personales",
    description: "Completá información de contacto y tu biografía.",
    href: "/dashboard/edit-profile/personal-data",
  },
  {
    id: "football-data",
    title: "Cargar datos futbolísticos",
    description: "Sumá trayectoria, club actual y links relevantes.",
    href: "/dashboard/edit-profile/football-data",
  },
  {
    id: "template",
    title: "Personalizar tu plantilla",
    description: "Elegí estilos, colores y estructura de tu perfil público.",
    href: "/dashboard/edit-template/styles",
  },
];

const QUICK_ACTIONS = [
  {
    id: "multimedia",
    title: "Gestionar multimedia",
    description: "Fotos, videos y novedades para potenciar tu perfil.",
    href: "/dashboard/edit-profile/multimedia",
  },
  {
    id: "subscription",
    title: "Estado de la suscripción",
    description: "Revisá tu plan actual y próximos cobros.",
    href: "/dashboard/settings/subscription",
  },
  {
    id: "account",
    title: "Preferencias de cuenta",
    description: "Actualizá correo, seguridad y notificaciones.",
    href: "/dashboard/settings/account",
  },
];

export default async function DashboardPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard");

  const [{ data: profileRaw }, { data: applicationRaw }] = await Promise.all([
    supabase
      .from("player_profiles")
      .select("id, status, slug, visibility")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("player_applications")
      .select("status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = (profileRaw as PlayerOverview | null) ?? null;
  const application = (applicationRaw as ApplicationOverview | null) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumen general"
        description="Visualizá el estado de tu perfil y los próximos pasos recomendados."
      />

      <SectionCard
        title="Estado del perfil"
        description="Controlá el progreso de tu perfil profesional y accedé rápidamente a las acciones clave."
      >
        <div className="space-y-3 text-sm text-neutral-300">
          {profile ? (
            <>
              <p>
                Tu perfil se encuentra en estado <span className="font-semibold">{profile.status}</span> con visibilidad
                <span className="font-semibold"> {profile.visibility}</span>.
              </p>
              {profile.slug ? (
                <p>
                  URL pública: <Link className="text-primary underline" href={`/${profile.slug}`}>/{profile.slug}</Link>
                </p>
              ) : (
                <p className="text-neutral-400">
                  Aún no definiste un identificador público. Podrás hacerlo desde la sección de datos personales.
                </p>
              )}
            </>
          ) : (
            <p>
              Todavía no completaste tu perfil de jugador. Comenzá el proceso desde el{' '}
              <Link className="text-primary underline" href="/onboarding/start">
                onboarding
              </Link>{' '}
              para solicitar tu cuenta profesional.
            </p>
          )}

          {!profile && application ? (
            <p className="text-neutral-400">
              Tu última solicitud está <span className="font-semibold text-neutral-200">{application.status}</span> desde{' '}
              {new Date(application.created_at).toLocaleDateString()}.
            </p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Próximos pasos"
        description="Estas tareas te ayudarán a completar la información necesaria para publicar tu perfil."
      >
        <ol className="space-y-3 text-sm text-neutral-300">
          {NEXT_STEPS.map((step) => (
            <li
              key={step.id}
              className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-4 transition-colors hover:border-neutral-700"
            >
              <div className="flex flex-col gap-1">
                <Link href={step.href} className="text-sm font-semibold text-white underline-offset-4 hover:underline">
                  {step.title}
                </Link>
                <p className="text-xs text-neutral-400">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard
        title="Atajos rápidos"
        description="Accedé directamente a las secciones que vas a utilizar con mayor frecuencia."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="flex h-full flex-col justify-between rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 transition-colors hover:border-neutral-700"
            >
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">{action.title}</p>
                <p className="text-xs text-neutral-400">{action.description}</p>
              </div>
              <span className="mt-4 text-xs font-medium text-primary">Ir a la sección →</span>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
