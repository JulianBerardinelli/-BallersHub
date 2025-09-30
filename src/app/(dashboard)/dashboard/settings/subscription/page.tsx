import Link from "next/link";
import { redirect } from "next/navigation";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

type SubscriptionData = {
  plan: string;
  status: string;
  current_period_end: string | null;
  canceled_at: string | null;
};

const PRO_FEATURES = [
  "Plantillas premium y personalización avanzada",
  "Dominio personalizado y branding libre",
  "Secciones multimedia ilimitadas",
  "Prioridad en soporte y revisiones de perfil",
];

export default async function SubscriptionSettingsPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard/settings/subscription");

  const { data: subscriptionRaw } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end, canceled_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const subscription = (subscriptionRaw as SubscriptionData | null) ?? null;

  const plan = subscription?.plan ?? "free";
  const status = subscription?.status ?? "inactive";
  const nextRenewal = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null;
  const canceledAt = subscription?.canceled_at
    ? new Date(subscription.canceled_at).toLocaleDateString()
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suscripción"
        description="Gestioná tu plan, monitoreá renovaciones y accedé a beneficios exclusivos."
      />

      <SectionCard
        title="Estado actual"
        description="Información del plan que se encuentra activo en este momento."
      >
        <div className="flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-950/40 p-5 text-sm text-neutral-300 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase text-neutral-500">Plan actual</p>
            <p className="text-lg font-semibold text-white">{plan.toUpperCase()}</p>
            <p className="text-xs text-neutral-400">Estado: {status}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-neutral-500">Próxima renovación</p>
            <p className="text-sm text-neutral-300">
              {nextRenewal ?? 'Sin fecha definida'}
            </p>
            {canceledAt ? (
              <p className="text-xs text-neutral-500">Cancelado el {canceledAt}</p>
            ) : null}
          </div>
          <span className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-500">
            Gestión automática vía Stripe (pendiente de integración)
          </span>
        </div>
      </SectionCard>

      <SectionCard
        title="Hazte Pro"
        description="Desbloqueá beneficios adicionales para potenciar tu perfil y exposición."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-5 text-sm text-neutral-300">
            <p className="text-lg font-semibold text-white">BallersHub Pro</p>
            <p className="text-xs text-neutral-400">Ideal para jugadores y representantes que buscan máxima visibilidad.</p>
            <ul className="mt-4 space-y-2 text-xs text-neutral-200">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40 p-5 text-sm text-neutral-400">
            <p className="text-xs uppercase text-neutral-500">Próximamente</p>
            <p className="text-base font-semibold text-white">Autogestión de upgrades</p>
            <p className="mt-2 text-xs text-neutral-400">
              Podrás seleccionar plan, ingresar medios de pago y gestionar facturación desde este módulo.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Acciones sobre la suscripción"
        description="Atajos para gestionar cambios de plan, cancelaciones y reactivaciones."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300">
            <p className="font-semibold text-white">Actualizar plan</p>
            <p className="text-xs text-neutral-400">
              Elegí entre planes Free, Pro o Enterprise según tus necesidades.
            </p>
            <span className="mt-3 inline-block rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-500">
              Disponible tras integrar checkout
            </span>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300">
            <p className="font-semibold text-white">Cancelar suscripción</p>
            <p className="text-xs text-neutral-400">
              Podrás solicitar cancelación inmediata o al finalizar el ciclo actual.
            </p>
            <span className="mt-3 inline-block rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-500">
              Opción disponible en roadmap
            </span>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300">
            <p className="font-semibold text-white">Soporte de facturación</p>
            <p className="text-xs text-neutral-400">
              ¿Consultas? Escribinos a{' '}
              <Link href="mailto:billing@ballershub.com" className="text-primary underline">
                billing@ballershub.com
              </Link>
              .
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Historial de facturación"
        description="Revisión de cargos y comprobantes emitidos."
      >
        <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-6 text-sm text-neutral-400">
          El historial de facturación se integrará con Stripe y permitirá descargar recibos y facturas.
        </div>
      </SectionCard>
    </div>
  );
}
