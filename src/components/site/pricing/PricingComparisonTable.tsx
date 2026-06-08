"use client";

// Audience-aware feature comparison: shows Free vs Pro of the currently
// selected audience (player or agency). The matrix text lives in
// messages/<locale>/pricing.json under `comparison.<audience>` (read via
// t.raw); must stay in sync with docs/pricing-matrix.md.

import { Check, Minus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Reveal } from "./Reveal";
import { usePricing } from "./PricingContext";
import {
  accentClasses,
  audienceAccent,
  type AccentClasses,
  type PricingT,
} from "./data";

type CellValue = boolean | string;

type Row = {
  label: string;
  /** [free, pro] */
  values: [CellValue, CellValue];
};

type FeatureGroup = {
  title: string;
  rows: Row[];
};

export default function PricingComparisonTable() {
  const t = useTranslations("pricing");
  const { audience } = usePricing();
  const groups = t.raw(`comparison.${audience}`) as FeatureGroup[];
  const accent = audienceAccent(audience);
  const accentCls = accentClasses(accent);
  const audienceLabel = t(`toggles.${audience}`);

  return (
    <section className="relative" aria-labelledby="pricing-comparison-title">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3 backdrop-blur-md">
          {t("comparison.badge")} · {audienceLabel}
        </span>
        <h2
          id="pricing-comparison-title"
          className="mt-4 font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-[2.5rem]"
        >
          {t("comparison.title")}
        </h2>
        <p className="mt-3 text-sm leading-[1.6] text-bh-fg-3">
          {t("comparison.description")}
        </p>
      </Reveal>

      <Reveal delay={0.12} className="mt-10">
        <div
          key={audience}
          className="overflow-hidden rounded-bh-xl border border-white/[0.08] bg-bh-surface-1/80 backdrop-blur"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th
                    scope="col"
                    className="bg-black/30 px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-4"
                  >
                    {t("comparison.feature")}
                  </th>
                  <th
                    scope="col"
                    className="bg-black/30 px-5 py-4 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-bh-fg-2"
                  >
                    {t("comparison.free")}
                  </th>
                  <th
                    scope="col"
                    className={`${accentCls.bgVeryFaint} px-5 py-4 text-center text-[11px] font-bold uppercase tracking-[0.14em] ${accentCls.text}`}
                  >
                    {t("comparison.pro")}
                    <span
                      className={`ml-1.5 rounded-bh-pill border ${accentCls.borderStrong} ${accentCls.bgSoft} px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] ${accentCls.text}`}
                    >
                      {t("comparison.top")}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group, gi) => (
                  <FeatureGroupRows
                    key={`${audience}-${group.title}`}
                    group={group}
                    firstGroup={gi === 0}
                    accentCls={accentCls}
                    t={t}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function FeatureGroupRows({
  group,
  firstGroup,
  accentCls,
  t,
}: {
  group: FeatureGroup;
  firstGroup: boolean;
  accentCls: AccentClasses;
  t: PricingT;
}) {
  return (
    <>
      <tr className={firstGroup ? "" : "border-t border-white/[0.06]"}>
        <th
          scope="rowgroup"
          colSpan={3}
          className="bg-black/20 px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-bh-fg-3"
        >
          {group.title}
        </th>
      </tr>
      {group.rows.map((row, ri) => (
        <tr
          key={row.label}
          className={`${
            ri === group.rows.length - 1 ? "" : "border-b border-white/[0.04]"
          } hover:bg-white/[0.02]`}
        >
          <td className="px-5 py-3 text-[13px] text-bh-fg-2">{row.label}</td>
          {row.values.map((v, ci) => (
            <td
              key={ci}
              className={`px-5 py-3 text-center ${
                ci === 1 ? accentCls.bgColumnTint : ""
              }`}
            >
              <CompareCell value={v} highlight={ci === 1} accentCls={accentCls} t={t} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function CompareCell({
  value,
  highlight,
  accentCls,
  t,
}: {
  value: CellValue;
  highlight: boolean;
  accentCls: AccentClasses;
  t: PricingT;
}) {
  if (value === true) {
    const cls = highlight
      ? `${accentCls.borderStrong} ${accentCls.bgSoft} ${accentCls.text}`
      : "border-white/[0.12] bg-white/[0.04] text-bh-fg-2";
    return (
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${cls}`}
        aria-label={t("comparison.included")}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  if (value === false) {
    return (
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.03] text-bh-fg-4"
        aria-label={t("comparison.notIncluded")}
      >
        <Minus className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  // string value (numbers, "Default", "Ilimitados", "—", etc.)
  const textCls = highlight ? accentCls.text : "text-bh-fg-2";
  return (
    <span className={`font-bh-mono text-[12px] font-semibold ${textCls}`}>
      {value}
    </span>
  );
}
