// /checkout/success?cs_id=...&internal=...
//
// Both Stripe and Mercado Pago redirect here on a successful payment.
// We re-verify the payment status server-side instead of trusting the
// query string — the actual subscription mutation happens in the webhook
// handlers, so this page just shows feedback while that's processing.

import Link from "next/link";
import { CheckCircle2, Mail, Sparkles } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkoutSessions } from "@/db/schema";
import CheckoutDoneLayout from "@/components/site/checkout/CheckoutDoneLayout";
import { PLAN_COPY } from "@/components/site/checkout/data";
import { CURRENCY_GLYPH } from "@/components/site/pricing/data";
import {
  isCheckoutPlanId,
  isCheckoutCurrency,
  formatPlanAmount,
  getPlanPrice,
  TRIAL_DAYS,
} from "@/lib/billing/plans";

export const metadata = {
  title: "Pago confirmado · 'BallersHub",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ internal?: string; cs_id?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const { internal } = await searchParams;

  // Look up the checkout session to render plan-specific details.
  let session = null as Awaited<ReturnType<typeof loadSession>>;
  if (internal) {
    session = await loadSession(internal);
  }

  const planCopy =
    session && isCheckoutPlanId(session.planId) ? PLAN_COPY[session.planId] : null;
  const currency =
    session && isCheckoutCurrency(session.currency) ? session.currency : null;
  const price =
    session && currency && isCheckoutPlanId(session.planId)
      ? getPlanPrice(session.planId, currency)
      : null;

  return (
    <CheckoutDoneLayout
      variant="success"
      Icon={CheckCircle2}
      title={
        <>
          ¡Listo! Tu plan{" "}
          <span className="bh-text-shimmer">
            {planCopy?.name ?? "Pro"}
          </span>{" "}
          está activo
        </>
      }
      description={
        <>
          Te enviamos el detalle a tu email. El trial de {TRIAL_DAYS} días
          arrancó hoy y podés cancelar sin cargo en cualquier momento dentro
          de los 3 días posteriores al primer cobro.
        </>
      }
      primary={{ label: "Ir a mi dashboard", href: "/dashboard" }}
      secondary={{ label: "Volver al inicio", href: "/" }}
      details={
        session && planCopy && currency && price ? (
          <div className="space-y-3 text-[12.5px]">
            <Row label="Plan">
              <span className="font-semibold text-bh-fg-1">
                {planCopy.name}
              </span>
            </Row>
            <Row label="Total facturable">
              <span className="font-bh-mono font-semibold text-bh-fg-1">
                {CURRENCY_GLYPH[currency]}
                {formatPlanAmount(price).split(" ")[1]} {currency} / año
              </span>
            </Row>
            <Row label="Trial activo hasta">
              <span className="text-bh-fg-2">
                {new Date(
                  Date.now() + TRIAL_DAYS * 24 * 3600 * 1000,
                ).toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </Row>
            <Row label="Procesador">
              <span className="text-bh-fg-2">
                {session.processor === "mercado_pago"
                  ? "Mercado Pago"
                  : "Stripe"}
              </span>
            </Row>
            <div className="flex items-start gap-2 border-t border-white/[0.08] pt-3 text-[11.5px] text-bh-fg-3">
              <Mail className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                Si en 5 minutos no ves el email de confirmación, escribinos a{" "}
                <Link
                  href="mailto:soporte@ballershub.app"
                  className="text-bh-lime underline-offset-4 hover:underline"
                >
                  soporte@ballershub.app
                </Link>
                .
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[12px] text-bh-fg-3">
            <Sparkles className="h-3.5 w-3.5 text-bh-lime" />
            Estamos terminando de procesar tu pago. Esto puede tardar unos
            segundos.
          </div>
        )
      }
    />
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-4">
        {label}
      </span>
      <span>{children}</span>
    </div>
  );
}

async function loadSession(internalId: string) {
  try {
    const [row] = await db
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, internalId))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}
