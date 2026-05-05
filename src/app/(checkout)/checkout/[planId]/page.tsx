// /checkout/[planId]?currency=USD|ARS|EUR — Step 2 (Pago).
// Lives in the (checkout) route group so it gets the dedicated topbar
// instead of SiteHeader.

import { redirect, notFound } from "next/navigation";

import { createSupabaseServerRSC } from "@/lib/supabase/server";
import {
  type CheckoutPlanId,
  type CheckoutCurrency,
  isCheckoutPlanId,
  isCheckoutCurrency,
  getPlanPrice,
  TRIAL_DAYS,
} from "@/lib/billing/plans";
import { CURRENCY_GLYPH } from "@/components/site/pricing/data";
import CheckoutForm from "@/components/site/checkout/CheckoutForm";
import CheckoutOrderSummary from "@/components/site/checkout/CheckoutOrderSummary";
import CheckoutStepper from "@/components/site/checkout/CheckoutStepper";
import PaymentMethodCard from "@/components/site/checkout/PaymentMethodCard";

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

  const defaultCountry = currency === "ARS" ? "AR" : currency === "EUR" ? "ES" : "US";

  return (
    <div className="space-y-10">
      <CheckoutStepper current="payment" />

      <section className="mx-auto max-w-2xl space-y-3 text-center">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3 backdrop-blur-md">
          Activar suscripción
        </span>
        <h1 className="font-bh-display text-3xl font-black uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          Estás a un paso de tu plan{" "}
          <span className="bh-text-shimmer">Pro</span>
        </h1>
        <p className="text-[13px] leading-[1.6] text-bh-fg-3">
          Cargá tus datos de facturación y te llevamos al procesador para
          confirmar la suscripción.
        </p>
      </section>

      {canceled === "1" && (
        <div className="mx-auto max-w-2xl rounded-bh-lg border border-bh-warning/30 bg-bh-warning/10 px-4 py-3 text-center text-[12.5px] text-bh-warning">
          Cancelaste el pago. Podés intentar de nuevo cuando quieras —
          tus datos siguen guardados.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <CheckoutForm
            planId={planId}
            currency={currency}
            defaultEmail={user.email ?? null}
            defaultCountry={defaultCountry}
          />
          <div className="bh-glass rounded-bh-xl p-6 md:p-7">
            <PaymentMethodCard currency={currency} />
          </div>
        </div>

        <CheckoutOrderSummary
          planId={planId}
          currency={currency}
          annualAmount={price.amount}
          trialDays={TRIAL_DAYS}
        />
      </div>

      <p className="text-center text-[11px] uppercase tracking-[0.14em] text-bh-fg-4">
        Cobro anual · Cancelable sin cargo dentro de los 3 días posteriores al
        fin del trial · {CURRENCY_GLYPH[currency]} {price.amount} {currency} / año
      </p>
    </div>
  );
}
