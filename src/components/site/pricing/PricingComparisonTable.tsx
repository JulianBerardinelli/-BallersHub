"use client";

// Audience-aware feature comparison: shows Free vs Pro of the currently
// selected audience (player or agency). Source of truth is the matrix below
// — must stay in sync with `docs/pricing-matrix.md`.

import { Check, Minus } from "lucide-react";
import { Reveal } from "./Reveal";
import { usePricing } from "./PricingContext";
import {
  accentClasses,
  audienceAccent,
  type AccentClasses,
  type Audience,
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

const PLAYER_GROUPS: FeatureGroup[] = [
  {
    title: "Identidad y perfil",
    rows: [
      { label: "Perfil profesional verificado", values: [true, true] },
      { label: "URL pública personalizable", values: [true, true] },
      { label: "Plantilla del perfil", values: ["Default", "Pro Portfolio"] },
      { label: "Galería catálogo (imágenes)", values: ["—", "5"] },
      { label: "Avatar", values: ["1", "1"] },
    ],
  },
  {
    title: "Multimedia y links",
    rows: [
      { label: "Videos de YouTube", values: ["2", "Ilimitados"] },
      { label: "Redes sociales", values: ["3", "Ilimitadas"] },
      { label: "Links a noticias / prensa", values: ["3", "Ilimitados"] },
    ],
  },
  {
    title: "Información profesional",
    rows: [
      { label: "Datos básicos (posición, club, edad)", values: [true, true] },
      { label: "Trayectoria / clubes", values: [true, true] },
      { label: "Valores de mercado", values: [false, true] },
      { label: "Valoraciones y logros", values: [false, true] },
      { label: "Descripciones por etapa de carrera", values: [false, true] },
    ],
  },
  {
    title: "Validación social",
    rows: [
      { label: "Reviews recibidas (con invitación)", values: [false, true] },
      { label: "Contactos de referencia", values: [false, true] },
    ],
  },
  {
    title: "Soporte",
    rows: [
      {
        label: "Solicitudes de corrección por rubro / semana",
        values: ["2", "5"],
      },
      { label: "Soporte humano prioritario", values: [false, true] },
    ],
  },
  {
    title: "SEO",
    rows: [
      { label: "Meta tags básicos + OG mínimo", values: [true, true] },
      { label: "Schema.org + sitemap dedicado + OG dinámico", values: [false, true] },
    ],
  },
];

const AGENCY_GROUPS: FeatureGroup[] = [
  {
    title: "Identidad y perfil",
    rows: [
      { label: "URL pública personalizable", values: [true, true] },
      { label: "Plantilla del perfil", values: ["Default", "Pro Portfolio (agency)"] },
      { label: "Galería catálogo (imágenes)", values: ["—", "5"] },
    ],
  },
  {
    title: "Equipo y cartera",
    rows: [
      { label: "Members del equipo (incluye owner)", values: ["2", "Ilimitados"] },
      { label: "Cartera de jugadores representados", values: ["5 max", "Ilimitada"] },
      { label: "Slots de Pro Player otorgables", values: ["—", "5"] },
    ],
  },
  {
    title: "Multimedia y links",
    rows: [
      { label: "Videos de YouTube", values: ["2", "Ilimitados"] },
      { label: "Redes sociales", values: ["3", "Ilimitadas"] },
      { label: "Links a noticias / prensa", values: ["3", "Ilimitados"] },
    ],
  },
  {
    title: "Información profesional",
    rows: [
      { label: "Datos básicos de la agencia", values: [true, true] },
      { label: "Valores de mercado de jugadores", values: [false, true] },
      { label: "Valoraciones y logros", values: [false, true] },
    ],
  },
  {
    title: "Validación social",
    rows: [
      { label: "Reviews recibidas (con invitación)", values: [false, true] },
      { label: "Contactos de referencia", values: [false, true] },
    ],
  },
  {
    title: "Soporte",
    rows: [
      {
        label: "Solicitudes de corrección por rubro / semana",
        values: ["2", "5"],
      },
      { label: "Soporte humano prioritario", values: [false, true] },
    ],
  },
  {
    title: "SEO",
    rows: [
      { label: "Meta tags básicos + OG mínimo", values: [true, true] },
      { label: "Schema.org + sitemap dedicado + OG dinámico", values: [false, true] },
    ],
  },
];

function groupsFor(audience: Audience) {
  return audience === "agency" ? AGENCY_GROUPS : PLAYER_GROUPS;
}

export default function PricingComparisonTable() {
  const { audience } = usePricing();
  const groups = groupsFor(audience);
  const accent = audienceAccent(audience);
  const accentCls = accentClasses(accent);
  const audienceLabel = audience === "agency" ? "Agencia" : "Jugador";

  return (
    <section className="relative" aria-labelledby="pricing-comparison-title">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3 backdrop-blur-md">
          Comparativa detallada · {audienceLabel}
        </span>
        <h2
          id="pricing-comparison-title"
          className="mt-4 font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-[2.5rem]"
        >
          Todo lo que cada plan incluye
        </h2>
        <p className="mt-3 text-sm leading-[1.6] text-bh-fg-3">
          Las funciones agrupadas por área. La columna de la derecha es la
          opción Pro recomendada para sacarle todo al producto.
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
                    Característica
                  </th>
                  <th
                    scope="col"
                    className="bg-black/30 px-5 py-4 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-bh-fg-2"
                  >
                    Free
                  </th>
                  <th
                    scope="col"
                    className={`${accentCls.bgVeryFaint} px-5 py-4 text-center text-[11px] font-bold uppercase tracking-[0.14em] ${accentCls.text}`}
                  >
                    Pro
                    <span
                      className={`ml-1.5 rounded-bh-pill border ${accentCls.borderStrong} ${accentCls.bgSoft} px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] ${accentCls.text}`}
                    >
                      Top
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
}: {
  group: FeatureGroup;
  firstGroup: boolean;
  accentCls: AccentClasses;
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
              <CompareCell value={v} highlight={ci === 1} accentCls={accentCls} />
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
}: {
  value: CellValue;
  highlight: boolean;
  accentCls: AccentClasses;
}) {
  if (value === true) {
    const cls = highlight
      ? `${accentCls.borderStrong} ${accentCls.bgSoft} ${accentCls.text}`
      : "border-white/[0.12] bg-white/[0.04] text-bh-fg-2";
    return (
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${cls}`}
        aria-label="Incluido"
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  if (value === false) {
    return (
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.03] text-bh-fg-4"
        aria-label="No incluido"
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
