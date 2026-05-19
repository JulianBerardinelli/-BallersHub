// /checkout/[planId]?currency=USD|ARS|EUR — Step 2 (Pago).
// Lives in the (checkout) route group so it gets the dedicated topbar
// instead of SiteHeader. Layout matches the Claude Design handoff:
// stepper centered, then 2-col main + 420px summary.

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { and, eq, inArray } from "drizzle-orm";

import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import {
  type CheckoutPlanId,
  type CheckoutCurrency,
  isCheckoutPlanId,
  isCheckoutCurrency,
  getPlanPrice,
  processorFor,
  TRIAL_DAYS,
} from "@/lib/billing/plans";
import { isProcessorConfigured } from "@/lib/billing/env";
import CheckoutForm from "@/components/site/checkout/CheckoutForm";
import CheckoutOrderSummary from "@/components/site/checkout/CheckoutOrderSummary";
import CheckoutStepper from "@/components/site/checkout/CheckoutStepper";

export const metadata = {
  title: "Checkout · 'BallersHub",
  description: "Completá tu suscripción al plan Pro de 'BallersHub.",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ currency?: string; canceled?: string }>;
};

export default async function CheckoutPage({ params, searchParams }: PageProps) {
  const { planId: rawPlanId } = await params;
  const { currency: rawCurrency, canceled } = await searchParams;

  if (!isCheckoutPlanId(rawPlanId)) notFound();
  const planId: CheckoutPlanId = rawPlanId;

  const currency: CheckoutCurrency = isCheckoutCurrency(rawCurrency ?? "")
    ? (rawCurrency as CheckoutCurrency)
    : "USD";

  const price = getPlanPrice(planId, currency);

  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const back = encodeURIComponent(`/checkout/${planId}?currency=${currency}`);
    redirect(`/auth/sign-up?redirectTo=${back}`);
  }

  // Multi-subscription guard: if the user already has a live (trialing /
  // active / past_due) subscription, send them to settings instead of
  // letting them double-pay. We tolerate DB hiccups by swallowing errors
  // — worst case the user reaches checkout and Stripe/MP would reject a
  // duplicate via processor-side dedupe.
  try {
    const [existing] = await db
      .select({
        id: subscriptions.id,
        planId: subscriptions.planId,
        statusV2: subscriptions.statusV2,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.id),
          inArray(subscriptions.statusV2, ["trialing", "active", "past_due"]),
        ),
      )
      .limit(1);
    if (existing) {
      redirect(
        `/dashboard/settings/subscription?already_subscribed=1&plan=${encodeURIComponent(
          existing.planId ?? "pro",
        )}`,
      );
    }
  } catch {
    // Non-fatal — proceed to checkout.
  }

  const defaultCountry =
    currency === "ARS" ? "AR" : currency === "EUR" ? "ES" : "US";

  const processor = processorFor(currency);
  const processorReady = isProcessorConfigured(processor);

  return (
    <div className="space-y-9">
      <CheckoutStepper current="payment" />

      {canceled === "1" && (
        <div className="mx-auto max-w-2xl rounded-bh-lg border border-bh-warning/30 bg-bh-warning/10 px-4 py-3 text-center text-[12.5px] text-bh-warning">
          Cancelaste el pago. Podés intentar de nuevo cuando quieras —
          tus datos siguen guardados.
        </div>
      )}

      {!processorReady && (
        <ProcessorNotReadyBanner currency={currency} planId={planId} />
      )}

      {/* `items-start` is required so the aside is its natural height
          (not stretched to match the form). Without it, `position: sticky`
          on the summary does nothing because the cell already fills the row. */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
        <CheckoutForm
          planId={planId}
          currency={currency}
          defaultEmail={user.email ?? null}
          defaultCountry={defaultCountry}
          disabled={!processorReady}
        />
        <CheckoutOrderSummary
          planId={planId}
          currency={currency}
          annualAmount={price.amount}
          trialDays={TRIAL_DAYS}
        />
      </div>
    </div>
  );
}

function ProcessorNotReadyBanner({
  currency,
  planId,
}: {
  currency: CheckoutCurrency;
  planId: CheckoutPlanId;
}) {
  const isMp = currency === "ARS";
  const altCurrency: CheckoutCurrency = isMp ? "USD" : "ARS";
  const altLabel = isMp ? "USD (Stripe)" : "ARS (Mercado Pago)";

  return (
    <div className="mx-auto max-w-2xl rounded-bh-lg border border-bh-warning/30 bg-bh-warning/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bh-warning" />
        <div className="flex-1 space-y-2 text-[12.5px]">
          <p className="font-semibold text-bh-warning">
            {isMp
              ? "Mercado Pago todavía no está configurado en este entorno."
              : "Stripe todavía no está configurado en este entorno."}
          </p>
          <p className="text-bh-fg-2">
            Estamos terminando de conectar este método de pago. Mientras tanto
            podés probar con{" "}
            <Link
              href={`/checkout/${planId}?currency=${altCurrency}`}
              className="font-semibold text-bh-lime underline-offset-4 hover:underline"
            >
              {altLabel}
            </Link>
            , o escribirnos a{" "}
            <Link
              href="mailto:soporte@ballershub.app"
              className="font-semibold text-bh-fg-1 underline-offset-4 hover:underline"
            >
              soporte@ballershub.app
            </Link>{" "}
            para que te avisemos cuando esté listo.
          </p>
        </div>
      </div>
    </div>
  );
}
