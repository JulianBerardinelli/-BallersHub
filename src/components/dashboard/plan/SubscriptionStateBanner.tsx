// Top-of-dashboard banner that surfaces subscription state events that
// the user should be aware of:
// - `trialing`     → soft countdown, optional dismiss
// - `cancelingSoon`→ Pro is on but will not renew at period end
// - `pastDue`      → payment failed, renewal pending
// - `expired`      → was Pro, plan reverted to Free
// - `compGrant`    → Pro via admin grant (not paid) — optional pill
//
// The banner is rendered server-side from the dashboard layout. We pass
// the resolved access object so all the math has already been done.

import Link from "next/link";
import { AlertTriangle, Clock, CreditCard, Gift } from "lucide-react";
import type { PlanAccess } from "@/lib/dashboard/plan-access";
import { daysUntilExpiry } from "@/lib/dashboard/plan-access";

export type SubscriptionStateBannerProps = {
  access: PlanAccess;
  /** Raw subscription row (sans transformation) — used to detect expired Pro. */
  rawSubscription: {
    plan: string | null;
    statusV2: string | null;
    currentPeriodEnd: string | null;
  } | null;
};

export default function SubscriptionStateBanner({
  access,
  rawSubscription,
}: SubscriptionStateBannerProps) {
  // Trial reminder
  if (access.isPro && access.isTrialing) {
    const days = daysUntilExpiry(access);
    if (days !== null && days <= 7) {
      return (
        <Banner tone="info" Icon={Clock}>
          <div className="space-y-0.5">
            <p className="text-[12.5px] font-semibold text-bh-fg-1">
              Estás en tu trial Pro · te {days === 1 ? "queda 1 día" : `quedan ${days} días`}.
            </p>
            <p className="text-[12px] leading-[1.5] text-bh-fg-3">
              Después del trial te cobramos automáticamente. Cancelable durante el trial sin cargo.
            </p>
          </div>
          <Link
            href="/dashboard/settings/subscription"
            className="text-[12px] font-bold text-bh-lime hover:underline"
          >
            Gestionar suscripción
          </Link>
        </Banner>
      );
    }
  }

  // Pro on but will not renew
  if (access.isPro && access.isCancelingSoon) {
    return (
      <Banner tone="warning" Icon={AlertTriangle}>
        <div className="space-y-0.5">
          <p className="text-[12.5px] font-semibold text-bh-fg-1">
            Tu plan Pro está activo pero no se va a renovar.
          </p>
          <p className="text-[12px] leading-[1.5] text-bh-fg-3">
            {access.expiresAt
              ? `El acceso Pro continúa hasta ${formatDate(access.expiresAt)}.`
              : "El acceso Pro continúa hasta el fin del período actual."}
          </p>
        </div>
        <Link
          href="/dashboard/settings/subscription"
          className="text-[12px] font-bold text-bh-warning hover:underline"
        >
          Reactivar
        </Link>
      </Banner>
    );
  }

  // Past due — payment failure, grace period
  if (rawSubscription?.statusV2 === "past_due") {
    return (
      <Banner tone="warning" Icon={CreditCard}>
        <div className="space-y-0.5">
          <p className="text-[12.5px] font-semibold text-bh-fg-1">
            Hubo un problema con tu pago.
          </p>
          <p className="text-[12px] leading-[1.5] text-bh-fg-3">
            Actualizá el método de pago para evitar perder el acceso Pro.
          </p>
        </div>
        <Link
          href="/dashboard/settings/subscription"
          className="text-[12px] font-bold text-bh-warning hover:underline"
        >
          Actualizar pago
        </Link>
      </Banner>
    );
  }

  // Was Pro, expired (plan still says 'pro' but lazy-resolved to free)
  if (
    !access.isPro &&
    rawSubscription &&
    (rawSubscription.plan === "pro" || rawSubscription.plan === "pro_plus") &&
    rawSubscription.statusV2 !== null &&
    rawSubscription.statusV2 !== "incomplete"
  ) {
    return (
      <Banner tone="danger" Icon={AlertTriangle}>
        <div className="space-y-0.5">
          <p className="text-[12.5px] font-semibold text-bh-fg-1">Tu plan Pro venció.</p>
          <p className="text-[12px] leading-[1.5] text-bh-fg-3">
            Recuperá las plantillas y secciones premium con un nuevo ciclo Pro.
          </p>
        </div>
        <Link
          href="/pricing"
          className="text-[12px] font-bold text-bh-lime hover:underline"
        >
          Renovar Pro
        </Link>
      </Banner>
    );
  }

  // Comp grant pill
  if (access.isPro && access.isAdminGrant) {
    return (
      <Banner tone="info" Icon={Gift}>
        <p className="text-[12.5px] font-semibold text-bh-fg-1">
          Cuenta de cortesía Pro
          {access.expiresAt ? ` · vigente hasta ${formatDate(access.expiresAt)}` : " · sin vencimiento"}
        </p>
      </Banner>
    );
  }

  return null;
}

type BannerTone = "info" | "warning" | "danger";

const TONE_CLASSES: Record<BannerTone, string> = {
  info: "border-bh-lime/25 bg-bh-lime/5 text-bh-lime",
  warning: "border-bh-warning/25 bg-bh-warning/5 text-bh-warning",
  danger: "border-rose-500/25 bg-rose-500/5 text-rose-400",
};

function Banner({
  tone,
  Icon,
  children,
}: {
  tone: BannerTone;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-bh-md border px-4 py-3 ${TONE_CLASSES[tone]}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
        {children}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
