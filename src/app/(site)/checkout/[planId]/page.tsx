// /checkout/[planId]?currency=USD|ARS|EUR
//
// Server-rendered page. Reads the plan + currency from the URL, resolves
// the price + processor server-side, and renders the form with the order
// summary. The actual payment redirect happens via the server action that
// the client form posts to.

import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { createSupabaseServerRSC } from "@/lib/supabase/server";
import {
  type CheckoutPlanId,
  type CheckoutCurrency,
  isCheckoutPlanId,
  isCheckoutCurrency,
  getPlanPrice,
  TRIAL_DAYS,
} from "@/lib/billing/plans";
import { COUNTRIES } from "@/components/site/checkout/data";
import CheckoutForm from "@/components/site/checkout/CheckoutForm";
import CheckoutOrderSummary from "@/components/site/checkout/CheckoutOrderSummary";
import { CURRENCY_GLYPH } from "@/components/site/pricing/data";

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

  // We always require auth for checkout. Guests get redirected to sign-up
  // with a return path that brings them back here.
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const back = encodeURIComponent(`/checkout/${planId}?currency=${currency}`);
    redirect(`/auth/sign-up?redirectTo=${back}`);
  }

  const defaultCountry = currency === "ARS" ? "AR" : currency === "EUR" ? "ES" : "US";
  const perMonth = formatPerMonth(price.amount, currency);
  const annual = formatAnnual(price.amount, currency);

  return (
    <div className="space-y-10 pb-12">
      {/* Top bar with back to pricing */}
      <header className="flex items-center justify-between gap-4">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 rounded-bh-md border border-white/[0.10] bg-white/[0.02] px-3 py-1.5 text-[12px] font-semibold text-bh-fg-2 transition-colors duration-150 hover:border-white/[0.18] hover:text-bh-fg-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a planes
        </Link>
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-bh-fg-4">
          <ShieldCheck className="h-3 w-3" />
          Checkout seguro
        </span>
      </header>

      {/* Hero */}
      <section className="space-y-3 text-center">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3 backdrop-blur-md">
          Activar suscripción
        </span>
        <h1 className="font-bh-display text-3xl font-black uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          Estás a un paso de tu plan{" "}
          <span className="bh-text-shimmer">Pro</span>
        </h1>
        <p className="mx-auto max-w-md text-[13px] leading-[1.6] text-bh-fg-3">
          Cargá tus datos de facturación y te llevamos al procesador de pagos
          para confirmar la suscripción.
        </p>
      </section>

      {canceled === "1" && (
        <div className="mx-auto max-w-2xl rounded-bh-lg border border-bh-warning/30 bg-bh-warning/10 px-4 py-3 text-center text-[12.5px] text-bh-warning">
          Cancelaste el pago. Podés intentar de nuevo cuando quieras —
          tus datos siguen guardados.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <CheckoutForm
          planId={planId}
          currency={currency}
          defaultEmail={user.email ?? null}
          defaultCountry={defaultCountry}
        />
        <CheckoutOrderSummary
          planId={planId}
          currency={currency}
          perMonthDisplay={perMonth}
          annualDisplay={annual}
          trialDays={TRIAL_DAYS}
        />
      </div>

      <p className="text-center text-[11px] uppercase tracking-[0.14em] text-bh-fg-4">
        Cobro anual · Cancelable sin cargo dentro de los 3 días posteriores al
        fin del trial · {CURRENCY_GLYPH[currency]} {annual} {currency} / año
      </p>
    </div>
  );
}

// Small local formatters — kept here because they're only used to display
// the order summary; the canonical pricing logic lives in pricing/data.ts.
function formatPerMonth(annual: number, currency: CheckoutCurrency): string {
  if (currency === "ARS") {
    return new Intl.NumberFormat("es-AR").format(Math.round(annual / 12));
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(annual / 12);
}

function formatAnnual(annual: number, currency: CheckoutCurrency): string {
  if (currency === "ARS") {
    return new Intl.NumberFormat("es-AR").format(annual);
  }
  if (currency === "EUR") {
    return new Intl.NumberFormat("de-DE").format(annual);
  }
  return String(annual);
}
