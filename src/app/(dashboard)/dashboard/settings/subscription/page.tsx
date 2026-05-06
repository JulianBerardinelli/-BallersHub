// /dashboard/settings/subscription
//
// Self-service subscription management. Reads the live state from
// `subscriptions` (Drizzle), surfaces appropriate CTAs per processor:
//   - Stripe → "Manage in Stripe portal" (POST /api/billing/portal)
//   - Mercado Pago → "Cancel subscription" (POST /api/billing/cancel)
//
// Refund window banner appears when within REFUND_GRACE_DAYS of the
// original `createdAt` — it nudges the user to cancel before the grace
// expires.

import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";

import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import {
  REFUND_GRACE_DAYS,
  TRIAL_DAYS,
  formatPlanAmount,
  getPlanPrice,
  isCheckoutCurrency,
  isCheckoutPlanId,
} from "@/lib/billing/plans";
import SubscriptionActions from "./components/SubscriptionActions";

type PageProps = {
  searchParams: Promise<{
    already_subscribed?: string;
    plan?: string;
    canceled?: string;
  }>;
};

export const metadata = {
  title: "Suscripción · 'BallersHub",
  robots: { index: false, follow: false },
};

const STATUS_COPY: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "muted" }
> = {
  trialing: { label: "Período de prueba", tone: "success" },
  active: { label: "Activa", tone: "success" },
  past_due: { label: "Pago pendiente", tone: "warning" },
  paused: { label: "Pausada", tone: "warning" },
  canceled: { label: "Cancelada", tone: "danger" },
  incomplete: { label: "Incompleta", tone: "warning" },
  inactive: { label: "Sin suscripción", tone: "muted" },
};

const PRO_PLAYER_FEATURES = [
  "Plantillas premium y personalización avanzada",
  "Dominio personalizado y branding libre",
  "Secciones multimedia ilimitadas",
  "Prioridad en soporte y revisiones de perfil",
];

const PRO_AGENCY_FEATURES = [
  "Panel multi-jugador con métricas comparadas",
  "Invitaciones ilimitadas y staff colaborador",
  "Branding de agencia en cada portfolio publicado",
  "Soporte prioritario para campañas y outreach",
];

export default async function SubscriptionSettingsPage({
  searchParams,
}: PageProps) {
  const { already_subscribed, plan: planFromQuery, canceled } =
    await searchParams;

  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/dashboard/settings/subscription");

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, user.id)))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  const statusKey = sub?.statusV2 ?? sub?.status ?? "inactive";
  const statusConfig = STATUS_COPY[statusKey] ?? STATUS_COPY.inactive;

  const planId = sub?.planId ?? planFromQuery ?? null;
  const planLabel =
    planId === "pro-agency"
      ? "BallersHub Pro Agency"
      : planId === "pro-player"
      ? "BallersHub Pro Player"
      : "Free";

  const formattedAmount =
    sub?.planId &&
    sub?.currency &&
    isCheckoutPlanId(sub.planId) &&
    isCheckoutCurrency(sub.currency)
      ? formatPlanAmount(getPlanPrice(sub.planId, sub.currency))
      : null;

  const trialEndsAt = sub?.trialEndsAt ? new Date(sub.trialEndsAt) : null;
  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd)
    : null;
  const canceledAt = sub?.canceledAt ? new Date(sub.canceledAt) : null;
  const createdAt = sub?.createdAt ? new Date(sub.createdAt) : null;

  const isWithinRefundWindow =
    !!createdAt &&
    sub?.statusV2 !== "canceled" &&
    Date.now() - createdAt.getTime() < REFUND_GRACE_DAYS * 24 * 3600 * 1000;

  const refundDeadline = createdAt
    ? new Date(createdAt.getTime() + REFUND_GRACE_DAYS * 24 * 3600 * 1000)
    : null;

  const features =
    planId === "pro-agency" ? PRO_AGENCY_FEATURES : PRO_PLAYER_FEATURES;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suscripción"
        description="Gestioná tu plan, descargas, métodos de pago y cancelaciones."
      />

      {already_subscribed === "1" && (
        <Banner tone="warning">
          Ya tenés un plan {planLabel} activo. Si querés cambiar, podés
          gestionarlo desde acá o cancelar primero el actual.
        </Banner>
      )}

      {canceled === "1" && (
        <Banner tone="success">
          Listo, tu suscripción quedó marcada para cancelación. Mantenés acceso
          hasta el final del período actual.
        </Banner>
      )}

      <SectionCard
        title="Estado actual"
        description="Información del plan que se encuentra activo en este momento."
      >
        <div className="grid gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-2 p-5 text-sm text-bh-fg-2 sm:grid-cols-3">
          <Field label="Plan">
            <p className="text-base font-semibold text-bh-fg-1">{planLabel}</p>
            {formattedAmount && (
              <p className="text-[12px] text-bh-fg-3">{formattedAmount} / año</p>
            )}
          </Field>
          <Field label="Estado">
            <StatusPill tone={statusConfig.tone}>
              {statusConfig.label}
            </StatusPill>
            {sub?.cancelAtPeriodEnd && periodEnd && (
              <p className="mt-1 text-[12px] text-bh-fg-3">
                Termina el {periodEnd.toLocaleDateString("es-AR")}
              </p>
            )}
          </Field>
          <Field
            label={
              statusKey === "trialing"
                ? "Fin del período de prueba"
                : "Próxima renovación"
            }
          >
            <p className="text-[13px] text-bh-fg-1">
              {statusKey === "trialing" && trialEndsAt
                ? trialEndsAt.toLocaleDateString("es-AR")
                : periodEnd
                ? periodEnd.toLocaleDateString("es-AR")
                : "—"}
            </p>
            {canceledAt && (
              <p className="text-[12px] text-bh-fg-3">
                Cancelado el {canceledAt.toLocaleDateString("es-AR")}
              </p>
            )}
          </Field>
        </div>

        {isWithinRefundWindow && refundDeadline && (
          <Banner tone="info">
            Tenés hasta el <strong>{refundDeadline.toLocaleDateString("es-AR")}</strong>{" "}
            para cancelar dentro del período de garantía de {REFUND_GRACE_DAYS}{" "}
            días. Si cancelás dentro de la ventana, te devolvemos el cobro
            inicial.
          </Banner>
        )}
      </SectionCard>

      {sub && sub.statusV2 && sub.statusV2 !== "canceled" && (
        <SectionCard
          title="Acciones sobre la suscripción"
          description={
            sub.processor === "stripe"
              ? "Stripe gestiona el portal de facturación: actualizá tarjeta, descargá facturas o cancelá desde un único lugar."
              : "Mercado Pago no expone un portal autoservicio. Desde acá cancelás directamente — el acceso se cierra al instante."
          }
        >
          <SubscriptionActions
            processor={sub.processor ?? "stripe"}
            cancelAtPeriodEnd={sub.cancelAtPeriodEnd ?? false}
          />
        </SectionCard>
      )}

      <SectionCard
        title={planId === "pro-agency" ? "Tu plan Pro Agency" : "Tu plan Pro Player"}
        description="Beneficios incluidos en el plan."
      >
        <ul className="grid gap-2 text-[13px] text-bh-fg-2 sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-bh-lime" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        {!sub && (
          <div className="mt-4 flex flex-col gap-2 rounded-bh-md border border-white/[0.08] bg-bh-surface-2 p-4 text-[13px] text-bh-fg-2 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Todavía no tenés un plan activo. Probá Pro {TRIAL_DAYS} días sin
              cargo.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-bh-md bg-bh-lime px-4 py-2 text-[12.5px] font-semibold text-bh-black transition-all hover:bg-[#d8ff26]"
            >
              Ver planes
            </Link>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Soporte de facturación"
        description="¿Algún problema con un cobro o factura?"
      >
        <p className="text-[13px] text-bh-fg-2">
          Escribinos a{" "}
          <Link
            href="mailto:billing@ballershub.app"
            className="font-semibold text-bh-lime underline-offset-4 hover:underline"
          >
            billing@ballershub.app
          </Link>{" "}
          y te respondemos el mismo día hábil.
        </p>
      </SectionCard>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-bh-fg-3">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "muted";
  children: React.ReactNode;
}) {
  const palette: Record<typeof tone, string> = {
    success:
      "border-bh-lime/30 bg-bh-lime/10 text-bh-lime",
    warning:
      "border-bh-warning/30 bg-bh-warning/10 text-bh-warning",
    danger:
      "border-bh-danger/30 bg-bh-danger/10 text-bh-danger",
    muted:
      "border-white/10 bg-white/5 text-bh-fg-3",
  };
  return (
    <span
      className={`inline-flex items-center rounded-bh-pill border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] ${palette[tone]}`}
    >
      {children}
    </span>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "info" | "warning" | "success";
  children: React.ReactNode;
}) {
  const palette: Record<typeof tone, string> = {
    info: "border-bh-blue/30 bg-bh-blue/10 text-bh-blue",
    warning: "border-bh-warning/30 bg-bh-warning/10 text-bh-warning",
    success: "border-bh-lime/30 bg-bh-lime/10 text-bh-lime",
  };
  return (
    <div
      className={`rounded-bh-lg border px-4 py-3 text-[13px] leading-[1.55] ${palette[tone]}`}
    >
      {children}
    </div>
  );
}
