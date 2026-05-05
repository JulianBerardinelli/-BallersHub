// Right-side order summary card. Server component — purely presentational.
// Uses the same design tokens as PricingPlans (bh-glass, bh-text-shimmer,
// the lime/blue accents) so the checkout feels like a continuation of the
// pricing page, not a different surface.

import { Check, Receipt, ShieldCheck, Sparkles } from "lucide-react";
import type { CheckoutPlanId, CheckoutCurrency } from "@/lib/billing/plans";
import { CURRENCY_GLYPH } from "@/components/site/pricing/data";
import { PLAN_COPY } from "./data";

const ACCENT_BY_PLAN: Record<CheckoutPlanId, "lime" | "blue"> = {
  "pro-player": "lime",
  "pro-agency": "blue",
};

const ACCENT_TEXT = {
  lime: "text-bh-lime",
  blue: "text-bh-blue",
} as const;

const SHIMMER = {
  lime: "bh-text-shimmer",
  blue: "bh-text-shimmer-blue",
} as const;

const ACCENT_BORDER = {
  lime: "border-[rgba(204,255,0,0.22)] bg-[rgba(204,255,0,0.08)]",
  blue: "border-[rgba(0,194,255,0.22)] bg-[rgba(0,194,255,0.08)]",
} as const;

export type CheckoutOrderSummaryProps = {
  planId: CheckoutPlanId;
  currency: CheckoutCurrency;
  perMonthDisplay: string;
  annualDisplay: string;
  trialDays: number;
};

export default function CheckoutOrderSummary(props: CheckoutOrderSummaryProps) {
  const accent = ACCENT_BY_PLAN[props.planId];
  const copy = PLAN_COPY[props.planId];
  const glyph = CURRENCY_GLYPH[props.currency];

  return (
    <aside className="bh-glass-strong bh-noise relative overflow-hidden rounded-bh-xl p-6 md:p-7">
      <header className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3">
            {copy.audienceLabel} · {copy.tagline}
          </p>
          <h2
            className={`mt-1 font-bh-display text-3xl font-black uppercase leading-none ${ACCENT_TEXT[accent]} md:text-4xl`}
          >
            {copy.name}
          </h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-bh-pill border border-white/[0.10] bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-bh-fg-3">
          <Receipt className="h-3 w-3" />
          Resumen
        </span>
      </header>

      <div className="mt-5">
        <div className="flex items-end gap-2">
          <span
            className={`font-bh-display text-[2.75rem] font-black leading-none ${SHIMMER[accent]}`}
          >
            <span className="mr-0.5 align-top text-[1.5rem] text-bh-fg-3">
              {glyph}
            </span>
            {props.perMonthDisplay}
          </span>
          <span className="pb-1.5 font-bh-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3">
            {props.currency}
          </span>
          <span className="pb-1.5 text-sm text-bh-fg-3">/mes</span>
        </div>
        <p className="mt-2 text-[12px] text-bh-fg-3">
          Facturado anualmente ·{" "}
          <span className="font-semibold text-bh-fg-2">
            {glyph}
            {props.annualDisplay} {props.currency}
          </span>{" "}
          / año
        </p>
      </div>

      <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="space-y-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-4">
          Incluye
        </span>
        <ul className="flex flex-col gap-2 text-[12.5px] text-bh-fg-2">
          {copy.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${ACCENT_BORDER[accent]} ${ACCENT_TEXT[accent]}`}
              >
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {props.trialDays > 0 && (
        <div
          className={`mt-6 rounded-bh-lg border p-4 ${ACCENT_BORDER[accent]}`}
        >
          <div className={`flex items-center gap-2 ${ACCENT_TEXT[accent]}`}>
            <Sparkles className="h-4 w-4" />
            <span className="text-[12px] font-bold uppercase tracking-[0.12em]">
              {props.trialDays} días de prueba gratis
            </span>
          </div>
          <p className="mt-2 text-[12px] leading-[1.55] text-bh-fg-2">
            No te cobramos hasta el día {props.trialDays + 1}. Cancelable
            sin cargo dentro de los 3 días posteriores al cobro.
          </p>
        </div>
      )}

      <div className="mt-6 flex items-start gap-2 text-[11px] text-bh-fg-3">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-bh-fg-2" />
        <span>
          Pago seguro con cifrado 256-bit. Procesado por{" "}
          {props.currency === "ARS" ? "Mercado Pago" : "Stripe"}. Nunca
          guardamos los datos de tu tarjeta.
        </span>
      </div>
    </aside>
  );
}
