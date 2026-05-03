"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "framer-motion";
import { ArrowRight, Check, ChevronDown, X } from "lucide-react";

import PricingDetailPanel, {
  type DetailPanelPlan,
} from "./PricingDetailPanel";
import {
  CURRENCY_GLYPH,
  accentClasses,
  audienceAccent,
  plansFor,
  type AccentClasses,
  type AccentColor,
  type Currency,
  type Plan,
  type PlanId,
} from "./data";
import { usePricing } from "./PricingContext";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function PricingPlans() {
  const { audience, currency } = usePricing();
  const plans = plansFor(audience);
  const accent = audienceAccent(audience);
  const accentCls = accentClasses(accent);

  // Default-open the highlighted plan (Pro). When AUDIENCE changes, re-anchor
  // to that audience's highlighted plan. We deliberately do NOT include
  // `plans` in the deps — the array reference changes every render, which
  // would re-fire this effect on every state change and overwrite manual
  // toggle clicks (the bug that broke "ocultar detalles" / Free scrolljack).
  const [activeId, setActiveId] = useState<PlanId | null>(() => {
    const next = plansFor("player");
    return next.find((p) => p.highlight)?.id ?? next[0]?.id ?? null;
  });

  useEffect(() => {
    const next = plansFor(audience);
    setActiveId(next.find((p) => p.highlight)?.id ?? next[0]?.id ?? null);
  }, [audience]);

  const activePlanIdx = activeId
    ? plans.findIndex((p) => p.id === activeId)
    : -1;
  const activePlan = activePlanIdx >= 0 ? plans[activePlanIdx] : null;

  return (
    <section aria-labelledby="pricing-plans-title" className="relative">
      <h2 id="pricing-plans-title" className="sr-only">
        Planes disponibles
      </h2>

      <AnimatePresence mode="wait">
        <m.div
          key={audience}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="grid items-stretch gap-5 md:grid-cols-2"
        >
          {plans.map((plan, idx) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currency={currency}
              accent={accent}
              accentCls={accentCls}
              active={plan.id === activeId}
              cardIndex={idx}
              onToggle={() =>
                setActiveId((cur) => (cur === plan.id ? null : plan.id))
              }
            />
          ))}
        </m.div>
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {activePlan && (
          <PricingDetailPanel
            key={activePlan.id}
            plan={planToDetailPlan(activePlan, accent)}
            activeIdx={Math.max(0, activePlanIdx)}
          />
        )}
      </AnimatePresence>

      <p className="mt-10 text-center text-[11px] uppercase tracking-[0.14em] text-bh-fg-4">
        Cobro anual · Cancelable sin cargo dentro de los 3 días posteriores al
        fin del trial
      </p>
    </section>
  );
}

function planToDetailPlan(plan: Plan, accent: AccentColor): DetailPanelPlan {
  return {
    id: plan.id,
    audience: plan.audience,
    tier: plan.tier,
    name: plan.name,
    tagline: plan.tagline,
    accent: plan.tier === "pro" ? accent : "neutral",
    ctaLabel: plan.ctaLabel,
    ctaHref: plan.ctaHref,
  };
}

// -------------------------- PlanCard ---------------------------

function PlanCard({
  plan,
  currency,
  accent,
  accentCls,
  active,
  cardIndex,
  onToggle,
}: {
  plan: Plan;
  currency: Currency;
  accent: AccentColor;
  accentCls: AccentClasses;
  active: boolean;
  cardIndex: number;
  onToggle: () => void;
}) {
  const accentText = plan.highlight ? accentCls.text : "text-bh-fg-1";

  const surfaceClass = plan.highlight
    ? "bh-glass-strong bh-glow-border bh-noise"
    : "bh-glass";

  const cta = plan.highlight
    ? `${accentCls.bg} ${accent === "blue" ? "text-bh-black" : "text-bh-black"} ${accentCls.shadow} ${accentCls.hoverBg} ${accentCls.hoverShadow} hover:-translate-y-px`
    : "border border-white/[0.14] text-bh-fg-1 hover:bg-white/[0.06]";

  const delay = ["bh-animate-d1", "bh-animate-d2"][cardIndex] ?? "";

  // Demo button hover/active state mirrors the audience accent so it stays
  // visually consistent with the rest of the card.
  const demoHover =
    accent === "blue"
      ? "hover:border-bh-blue/30 hover:bg-bh-blue/[0.04] hover:text-bh-blue"
      : "hover:border-bh-lime/30 hover:bg-bh-lime/[0.04] hover:text-bh-lime";
  const demoActive =
    accent === "blue"
      ? "border-bh-blue/40 bg-bh-blue/[0.08] text-bh-blue"
      : "border-bh-lime/40 bg-bh-lime/[0.08] text-bh-lime";
  const demoBtnClass = active
    ? demoActive
    : `border-white/[0.10] bg-white/[0.02] text-bh-fg-2 ${demoHover}`;

  // Highlighted card's ambient gradient — accent on top, the opposite tone
  // softly on the bottom for depth.
  const ambientGradient =
    accent === "blue"
      ? "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,194,255,0.10) 0%, transparent 70%), radial-gradient(ellipse 80% 60% at 50% 100%, rgba(204,255,0,0.05) 0%, transparent 70%)"
      : "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(204,255,0,0.10) 0%, transparent 70%), radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,194,255,0.06) 0%, transparent 70%)";

  return (
    <article
      className={`bh-animate-in ${delay} bh-card-lift relative flex h-full flex-col overflow-hidden rounded-bh-xl p-6 ${surfaceClass}`}
    >
      {plan.highlight && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-[2] rounded-bh-xl"
          style={{ background: ambientGradient }}
        />
      )}

      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3">
            {plan.tagline}
          </p>
          <h3
            className={`mt-1 font-bh-display text-xl font-bold uppercase leading-none md:text-2xl ${accentText}`}
          >
            {plan.name}
          </h3>
        </div>
        {plan.badge && (
          <span
            className={`inline-flex items-center rounded-bh-pill border ${accentCls.borderStrong} ${accentCls.bgBadge} px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${accentCls.text}`}
          >
            {plan.badge}
          </span>
        )}
      </header>

      <PriceBlock plan={plan} currency={currency} accentCls={accentCls} />

      <p className="mt-3 text-[12.5px] leading-[1.55] text-bh-fg-2">
        {plan.description}
      </p>

      <div className="my-5 h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <ul className="flex flex-col gap-2 text-[12.5px]">
        {plan.features.map((f, i) => (
          <li
            key={i}
            className={`flex items-start gap-2.5 ${
              f.included
                ? "text-bh-fg-2"
                : "text-bh-fg-4 line-through decoration-white/15"
            }`}
          >
            <FeatureIcon
              included={f.included}
              highlight={plan.highlight}
              accentCls={accentCls}
            />
            <span>{f.label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-2 pt-6">
        <Link
          href={plan.ctaHref}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-bh-md px-5 py-2.5 text-sm font-semibold transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] ${cta}`}
        >
          {plan.ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={active}
          aria-controls={`plan-detail-${plan.id}`}
          className={`group inline-flex w-full items-center justify-center gap-2 rounded-bh-md border px-4 py-2.5 text-[11.5px] font-bold uppercase tracking-[0.16em] transition-all duration-200 ${demoBtnClass}`}
        >
          Ver demo
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              active ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
    </article>
  );
}

function PriceBlock({
  plan,
  currency,
  accentCls,
}: {
  plan: Plan;
  currency: Currency;
  accentCls: AccentClasses;
}) {
  if (!plan.pricing) {
    return (
      <div className="mt-5">
        <span className="font-bh-display text-[2.5rem] font-black leading-none text-bh-fg-1">
          Gratis
        </span>
        <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-bh-fg-4">
          Para siempre · sin tarjeta
        </p>
      </div>
    );
  }

  const price = plan.pricing[currency];
  const glyph = CURRENCY_GLYPH[currency];

  return (
    <div className="mt-5">
      <div className="flex items-end gap-2">
        <span
          className={`font-bh-display text-[2.5rem] font-black leading-none md:text-[2.75rem] ${
            plan.highlight ? accentCls.shimmerClass : "text-bh-fg-1"
          }`}
        >
          <span className="mr-0.5 align-top text-[1.5rem] text-bh-fg-3 md:text-[1.75rem]">
            {glyph}
          </span>
          {price.perMonthDisplay}
        </span>
        <span className="pb-1.5 font-bh-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3">
          {price.symbol}
        </span>
        <span className="pb-1.5 text-sm text-bh-fg-3">/mes</span>
      </div>
      <p className="mt-2 text-[11px] text-bh-fg-3">
        Facturado anualmente ·{" "}
        <span className="font-semibold text-bh-fg-2">
          {glyph}
          {price.annualDisplay} {price.symbol}
        </span>{" "}
        / año
      </p>
    </div>
  );
}

function FeatureIcon({
  included,
  highlight,
  accentCls,
}: {
  included: boolean;
  highlight?: boolean;
  accentCls: AccentClasses;
}) {
  if (included) {
    const cls = highlight
      ? `${accentCls.text} ${accentCls.bgSoft} ${accentCls.borderSoft}`
      : "text-bh-fg-2 bg-white/[0.06] border-white/[0.12]";
    return (
      <span
        aria-hidden
        className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${cls}`}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  }
  // Excluded — red X to make the missing feature unmistakable.
  return (
    <span
      aria-hidden
      className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.10)] text-bh-danger"
    >
      <X className="h-2.5 w-2.5" strokeWidth={3} />
    </span>
  );
}
