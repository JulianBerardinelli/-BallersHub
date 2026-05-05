"use client";

// Order summary panel matching the Claude Design handoff: plan row with
// icon + meta + price column, optional trial banner, line-by-line totals
// (Subtotal · Cupón · IVA when ARS · A pagar hoy / Total · Después del
// trial), inline coupon bar, footer with reassurance bullets.

import { useMemo, useState } from "react";
import {
  Check,
  Shield,
  Sparkle,
  Star,
  Trophy,
} from "lucide-react";
import type { CheckoutPlanId, CheckoutCurrency } from "@/lib/billing/plans";
import { PLAN_COPY } from "./data";

const ROLE_BY_PLAN: Record<CheckoutPlanId, "player" | "agent"> = {
  "pro-player": "player",
  "pro-agency": "agent",
};

const CURRENCY_PREFIX: Record<CheckoutCurrency, string> = {
  USD: "US$",
  EUR: "€",
  ARS: "$",
};

const DEMO_COUPONS: Record<string, { percent: number }> = {
  BH20: { percent: 20 },
};

const IVA_RATE_BY_CURRENCY: Record<CheckoutCurrency, number> = {
  ARS: 0.21, // IVA 21% on ARS purchases
  USD: 0,
  EUR: 0,
};

export type CheckoutOrderSummaryProps = {
  planId: CheckoutPlanId;
  currency: CheckoutCurrency;
  /** Annual amount in major units. Subtotal is computed from this. */
  annualAmount: number;
  trialDays: number;
};

export default function CheckoutOrderSummary(props: CheckoutOrderSummaryProps) {
  const role = ROLE_BY_PLAN[props.planId];
  const copy = PLAN_COPY[props.planId];
  const sym = CURRENCY_PREFIX[props.currency];

  const monthly = props.annualAmount / 12;

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const annual = props.annualAmount;
    const couponDef = appliedCoupon ? DEMO_COUPONS[appliedCoupon] : null;
    const couponDiscount = couponDef
      ? Math.round(annual * (couponDef.percent / 100))
      : 0;
    const subtotal = annual - couponDiscount;
    const taxRate = IVA_RATE_BY_CURRENCY[props.currency];
    const tax = Math.round(subtotal * taxRate);
    const total = subtotal + tax;
    return {
      annual,
      couponDiscount,
      couponPercent: couponDef?.percent ?? 0,
      taxRate,
      tax,
      total,
    };
  }, [props.annualAmount, props.currency, appliedCoupon]);

  const applyCoupon = () => {
    setCouponError(null);
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    if (DEMO_COUPONS[code]) {
      setAppliedCoupon(code);
      setCouponInput("");
      return;
    }
    setCouponError("Cupón no válido. Probá con BH20.");
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const isTrial = props.trialDays > 0;

  return (
    <aside className="sticky top-[92px] overflow-hidden rounded-xl border border-white/[0.06] bg-bh-surface-1">
      <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <h2 className="font-bh-display text-[14px] font-bold uppercase tracking-[0.04em] text-bh-fg-1">
          Tu pedido
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-bh-mono text-[10px] uppercase tracking-[0.04em] ${
            role === "player"
              ? "border-bh-lime/25 bg-bh-lime/10 text-bh-lime"
              : "border-bh-blue/25 bg-bh-blue/10 text-bh-blue"
          }`}
        >
          {role === "player" ? "Jugador" : "Agente"}
        </span>
      </header>

      <div className="p-5">
        {/* Plan row */}
        <div className="flex items-start gap-3.5 border-b border-white/[0.06] pb-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border border-bh-lime/25 bg-gradient-to-br from-bh-lime/15 to-bh-lime/5 text-bh-lime">
            {role === "player" ? (
              <Star className="h-5 w-5" strokeWidth={2} />
            ) : (
              <Trophy className="h-5 w-5" strokeWidth={2} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bh-display text-[18px] font-extrabold uppercase tracking-[0.03em] text-bh-fg-1">
              {copy.name}
            </p>
            <p className="text-[12px] text-bh-fg-3">{copy.tagline}</p>
            <p className="mt-1 text-[12px] text-bh-fg-2">Facturación anual</p>
          </div>
          <div className="text-right">
            <p className="font-bh-display text-[22px] font-black text-bh-fg-1">
              {sym}
              {fmt(monthly, props.currency)}
              <span className="ml-0.5 align-baseline text-[12px] font-medium text-bh-fg-3">
                /mes
              </span>
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-bh-fg-3">
              {sym}
              {fmt(props.annualAmount, props.currency)} {props.currency} ·
              facturado anualmente
            </p>
          </div>
        </div>

        {/* Trial banner */}
        {isTrial && (
          <div className="mt-4 flex items-center gap-2.5 rounded-[10px] border border-bh-lime/20 bg-bh-lime/[0.06] px-3.5 py-3 text-[12px] text-bh-fg-1">
            <Sparkle className="h-3.5 w-3.5 shrink-0 text-bh-lime" />
            <div className="min-w-0 flex-1">
              <p className="font-bh-display text-[12px] font-extrabold uppercase tracking-[0.04em] text-bh-lime">
                Free trial {props.trialDays} días
              </p>
              <p className="mt-0.5 text-[11px] text-bh-fg-2">
                No se cobra hasta el {trialEndLabel(props.trialDays)}
              </p>
            </div>
          </div>
        )}

        {/* Line items */}
        <div className="mt-2">
          <Line label="Subtotal anual" value={`${sym}${fmt(totals.annual, props.currency)}`} />
          {appliedCoupon && (
            <Line
              label={`Cupón ${appliedCoupon} (−${totals.couponPercent}%)`}
              value={`−${sym}${fmt(totals.couponDiscount, props.currency)}`}
              variant="discount"
              onClear={removeCoupon}
            />
          )}
          {totals.tax > 0 && (
            <Line
              label="IVA 21%"
              value={`${sym}${fmt(totals.tax, props.currency)}`}
              variant="muted"
            />
          )}
        </div>

        {/* Coupon bar */}
        {!appliedCoupon && (
          <div className="mt-3.5 flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyCoupon();
                }
              }}
              placeholder="Código de cupón"
              className="flex-1 rounded-[9px] border border-white/[0.12] bg-[#141414] px-3.5 py-2.5 font-bh-mono text-[12px] tracking-[0.04em] text-bh-fg-1 placeholder:text-bh-fg-4 focus:border-bh-lime focus:outline-none focus:ring-2 focus:ring-bh-lime/20"
            />
            <button
              type="button"
              onClick={applyCoupon}
              className="rounded-[9px] border border-white/[0.12] bg-transparent px-4 text-[13px] font-medium text-bh-fg-1 transition-colors hover:border-white/[0.22] hover:bg-white/[0.04]"
            >
              Aplicar
            </button>
          </div>
        )}
        {couponError && (
          <p className="mt-2 text-[11px] text-bh-danger">{couponError}</p>
        )}

        {/* Total */}
        <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4 font-bh-display font-extrabold uppercase tracking-[0.04em] text-bh-fg-1">
          <span className="text-[14px]">{isTrial ? "A pagar hoy" : "Total"}</span>
          <span className="text-[24px] font-black">
            {sym}
            {fmt(isTrial ? 0 : totals.total, props.currency)}
          </span>
        </div>
        {isTrial && (
          <div className="flex items-center justify-between text-[13px] text-bh-fg-3">
            <span>Después del trial</span>
            <span className="font-bh-mono">
              {sym}
              {fmt(totals.total, props.currency)}/año
            </span>
          </div>
        )}
      </div>

      {/* Footer reassurance */}
      <div className="space-y-2 border-t border-white/[0.06] bg-black/25 px-5 py-4 text-[11px] text-bh-fg-3">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 shrink-0 text-bh-lime" />
          <span>Cancelá cuando quieras desde tu cuenta</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 shrink-0 text-bh-lime" />
          <span>3 días de garantía de devolución post-cobro</span>
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function Line({
  label,
  value,
  variant = "default",
  onClear,
}: {
  label: string;
  value: string;
  variant?: "default" | "muted" | "discount";
  onClear?: () => void;
}) {
  const labelCls =
    variant === "muted"
      ? "text-bh-fg-3"
      : variant === "discount"
        ? "text-bh-fg-2"
        : "text-bh-fg-2";
  const valueCls =
    variant === "discount"
      ? "text-bh-lime"
      : variant === "muted"
        ? "text-bh-fg-3"
        : "text-bh-fg-1";

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
      <span className={`flex items-center gap-2 ${labelCls}`}>
        {label}
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] uppercase tracking-[0.10em] text-bh-fg-4 transition-colors hover:text-bh-danger"
          >
            quitar
          </button>
        )}
      </span>
      <span className={`font-bh-mono ${valueCls}`}>{value}</span>
    </div>
  );
}

function fmt(amount: number, currency: CheckoutCurrency): string {
  if (amount === 0) return "0";
  if (currency === "ARS") {
    return new Intl.NumberFormat("es-AR").format(Math.round(amount));
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function trialEndLabel(days: number): string {
  const d = new Date(Date.now() + days * 24 * 3600 * 1000);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
