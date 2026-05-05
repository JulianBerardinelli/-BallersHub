// Visual card showing which processor will handle the payment.
// Currency drives the processor (USD/EUR → Stripe, ARS → Mercado Pago)
// so we don't render a real picker — just the chosen method, big, with
// trust signals. See docs/checkout-architecture.md §Phase 2.5.

import { Lock } from "lucide-react";
import type { CheckoutCurrency } from "@/lib/billing/plans";

export type PaymentMethodCardProps = {
  currency: CheckoutCurrency;
};

export default function PaymentMethodCard({ currency }: PaymentMethodCardProps) {
  const isMp = currency === "ARS";

  return (
    <fieldset className="space-y-3">
      <legend className="flex w-full items-center justify-between gap-3">
        <span className="space-y-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-bh-fg-4">
            Paso 3 · Método de pago
          </span>
          <span className="block font-bh-heading text-base font-bold text-bh-fg-1">
            ¿Cómo querés pagar?
          </span>
        </span>
        <span className="hidden items-center gap-1.5 rounded-bh-pill border border-white/[0.10] bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-3 sm:inline-flex">
          <Lock className="h-2.5 w-2.5 text-bh-success" />
          Encriptado · PCI DSS
        </span>
      </legend>

      {isMp ? <MpCard /> : <StripeCard />}

      <p className="text-[11.5px] leading-[1.55] text-bh-fg-3">
        Tus datos de pago se procesan directamente en{" "}
        <strong className="text-bh-fg-2">
          {isMp ? "Mercado Pago" : "Stripe"}
        </strong>
        . &apos;BallersHub nunca almacena la información sensible de tu tarjeta.
      </p>
    </fieldset>
  );
}

function StripeCard() {
  return (
    <div className="bh-glass flex items-center gap-4 rounded-bh-lg border border-bh-lime/30 bg-bh-lime/[0.04] p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-bh-lime bg-bh-lime/10">
        <span className="h-3 w-3 rounded-full bg-bh-lime" />
      </span>
      <span className="flex h-9 items-center justify-center rounded-bh-md bg-[#635BFF] px-3 font-bh-heading text-[13px] font-black tracking-tight text-white">
        stripe
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-bh-fg-1">
          Tarjeta de crédito o débito
        </div>
        <div className="text-[11.5px] text-bh-fg-3">
          Visa · Mastercard · American Express · Apple Pay · 1-clic checkout
        </div>
      </div>
      <div className="hidden flex-wrap gap-1.5 md:flex">
        <Tag>VISA</Tag>
        <Tag>MC</Tag>
        <Tag>AMEX</Tag>
      </div>
    </div>
  );
}

function MpCard() {
  return (
    <div className="bh-glass flex items-center gap-4 rounded-bh-lg border border-bh-blue/30 bg-bh-blue/[0.04] p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-bh-blue bg-bh-blue/10">
        <span className="h-3 w-3 rounded-full bg-bh-blue" />
      </span>
      <span className="flex h-9 items-center justify-center rounded-bh-md bg-[#009EE3] px-3 font-bh-heading text-[12px] font-black tracking-tight text-white">
        MP
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-bh-fg-1">
          Mercado Pago
        </div>
        <div className="text-[11.5px] text-bh-fg-3">
          Hasta 12 cuotas · Tarjetas locales · Dinero en cuenta · Pago Fácil · Rapipago
        </div>
      </div>
      <div className="hidden flex-wrap gap-1.5 md:flex">
        <Tag>12x</Tag>
        <Tag>ARS</Tag>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-bh-sm border border-white/[0.10] bg-white/[0.04] px-1.5 font-bh-mono text-[9px] font-bold uppercase tracking-[0.10em] text-bh-fg-2">
      {children}
    </span>
  );
}
