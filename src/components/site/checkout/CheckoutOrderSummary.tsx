"use client";

// Order summary with embedded coupon input. Client component because it
// owns the coupon state + re-renders the price block when a code applies.
//
// `BH20` is a hardcoded demo coupon (20% off). Real coupon redemption
// (Stripe Coupons API + MP discounts + DB table) lands in Phase 3.

import { useMemo, useState } from "react";
import { Check, Receipt, ShieldCheck, Sparkles, Tag, X } from "lucide-react";
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

// Demo-only coupon table. Replace with a real lookup in Phase 3.
const DEMO_COUPONS: Record<string, { percent: number; label: string }> = {
  BH20: { percent: 20, label: "Lanzamiento BallersHub — 20% de descuento" },
};

export type CheckoutOrderSummaryProps = {
  planId: CheckoutPlanId;
  currency: CheckoutCurrency;
  /** Base annual amount in major units (USD/EUR/ARS). Used for discount math. */
  annualAmount: number;
  trialDays: number;
};

export default function CheckoutOrderSummary(props: CheckoutOrderSummaryProps) {
  const accent = ACCENT_BY_PLAN[props.planId];
  const copy = PLAN_COPY[props.planId];
  const glyph = CURRENCY_GLYPH[props.currency];

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const discount = useMemo(() => {
    if (!appliedCoupon) return null;
    const def = DEMO_COUPONS[appliedCoupon];
    if (!def) return null;
    const off = Math.round(props.annualAmount * (def.percent / 100));
    return { code: appliedCoupon, percent: def.percent, label: def.label, off };
  }, [appliedCoupon, props.annualAmount]);

  const finalAnnual = props.annualAmount - (discount?.off ?? 0);
  const finalPerMonth = finalAnnual / 12;

  const applyCoupon = () => {
    setCouponError(null);
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    if (DEMO_COUPONS[code]) {
      setAppliedCoupon(code);
      setCouponInput("");
      return;
    }
    setCouponError("Código no válido. Probá con BH20.");
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

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

      {/* Price block — re-renders when a coupon applies */}
      <div className="mt-5">
        <div className="flex items-end gap-2">
          <span
            className={`font-bh-display text-[2.75rem] font-black leading-none ${SHIMMER[accent]}`}
          >
            <span className="mr-0.5 align-top text-[1.5rem] text-bh-fg-3">
              {glyph}
            </span>
            {formatPerMonth(finalPerMonth, props.currency)}
          </span>
          <span className="pb-1.5 font-bh-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3">
            {props.currency}
          </span>
          <span className="pb-1.5 text-sm text-bh-fg-3">/mes</span>
        </div>
        <p className="mt-2 text-[12px] text-bh-fg-3">
          Facturado anualmente ·{" "}
          {discount ? (
            <>
              <span className="line-through decoration-white/30">
                {glyph}
                {formatAnnual(props.annualAmount, props.currency)}
              </span>{" "}
              <span className={`font-semibold ${ACCENT_TEXT[accent]}`}>
                {glyph}
                {formatAnnual(finalAnnual, props.currency)} {props.currency}
              </span>{" "}
              / año
            </>
          ) : (
            <span className="font-semibold text-bh-fg-2">
              {glyph}
              {formatAnnual(props.annualAmount, props.currency)} {props.currency} / año
            </span>
          )}
        </p>
      </div>

      <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Coupon input */}
      <CouponBlock
        accent={accent}
        couponInput={couponInput}
        setCouponInput={setCouponInput}
        appliedCoupon={appliedCoupon}
        discount={discount}
        couponError={couponError}
        applyCoupon={applyCoupon}
        removeCoupon={removeCoupon}
        glyph={glyph}
        currency={props.currency}
      />

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

// ---------------------------------------------------------------
// Coupon UI
// ---------------------------------------------------------------

function CouponBlock(props: {
  accent: "lime" | "blue";
  couponInput: string;
  setCouponInput: (v: string) => void;
  appliedCoupon: string | null;
  discount: { code: string; percent: number; label: string; off: number } | null;
  couponError: string | null;
  applyCoupon: () => void;
  removeCoupon: () => void;
  glyph: string;
  currency: CheckoutCurrency;
}) {
  if (props.discount && props.appliedCoupon) {
    return (
      <div
        className={`flex items-start gap-3 rounded-bh-lg border ${ACCENT_BORDER[props.accent]} p-3.5`}
      >
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${ACCENT_BORDER[props.accent]} ${ACCENT_TEXT[props.accent]}`}
        >
          <Tag className="h-3 w-3" />
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`font-bh-mono text-[12px] font-bold ${ACCENT_TEXT[props.accent]}`}
            >
              {props.discount.code}
            </span>
            <button
              type="button"
              onClick={props.removeCoupon}
              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-4 transition-colors hover:text-bh-danger"
            >
              <X className="h-3 w-3" />
              Quitar
            </button>
          </div>
          <p className="mt-1 text-[11.5px] leading-[1.4] text-bh-fg-3">
            {props.discount.label}
          </p>
          <p
            className={`mt-1.5 text-[11.5px] font-semibold ${ACCENT_TEXT[props.accent]}`}
          >
            −{props.discount.percent}% · ahorrás {props.glyph}
            {formatAnnual(props.discount.off, props.currency)}{" "}
            {props.currency} / año
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-4">
        <Tag className="h-3 w-3" />
        ¿Tenés un código?
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={props.couponInput}
          onChange={(e) => props.setCouponInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              props.applyCoupon();
            }
          }}
          placeholder="BH20"
          className="w-full rounded-bh-md border border-white/[0.10] bg-white/[0.02] px-3 py-2 font-bh-mono text-[12px] tracking-[0.06em] text-bh-fg-1 placeholder:text-bh-fg-4 focus:border-bh-lime/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={props.applyCoupon}
          disabled={props.couponInput.trim().length === 0}
          className="rounded-bh-md border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-bh-fg-2 transition-colors hover:border-bh-lime/30 hover:bg-bh-lime/[0.06] hover:text-bh-lime disabled:cursor-not-allowed disabled:opacity-50"
        >
          Aplicar
        </button>
      </div>
      {props.couponError && (
        <p className="text-[11px] text-bh-danger">{props.couponError}</p>
      )}
    </div>
  );
}

function formatPerMonth(amount: number, currency: CheckoutCurrency): string {
  if (currency === "ARS") {
    return new Intl.NumberFormat("es-AR").format(Math.round(amount));
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatAnnual(amount: number, currency: CheckoutCurrency): string {
  if (currency === "ARS") {
    return new Intl.NumberFormat("es-AR").format(amount);
  }
  if (currency === "EUR") {
    return new Intl.NumberFormat("de-DE").format(amount);
  }
  return String(amount);
}
