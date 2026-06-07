// src/components/site/about/CoreValues.tsx
// Grid 3x2 de valores fundamentales con micro-iconografía y tarjetas glass.

import { getTranslations } from "next-intl/server";

import SectionHeader from "./SectionHeader";
import { ACCENT_STYLES, getValues, type Value } from "./data";

export default async function CoreValues() {
  const t = await getTranslations("about");
  const values = getValues(t);

  return (
    <section className="space-y-10">
      <SectionHeader
        eyebrow={t("sections.values.eyebrow")}
        title={
          <>
            {t("sections.values.titlePlain")}{" "}
            <span className="text-bh-blue">{t("sections.values.titleHighlight")}</span>
          </>
        }
        description={t("sections.values.description")}
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {values.map((value) => (
          <ValueCard key={value.title} value={value} />
        ))}
      </div>
    </section>
  );
}

function ValueCard({ value }: { value: Value }) {
  const Icon = value.icon;
  const a = ACCENT_STYLES[value.accent];

  return (
    <article className="bh-card-lift relative flex h-full flex-col gap-4 overflow-hidden rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6">
      {/* Línea acento superior */}
      <span
        aria-hidden
        className={`absolute inset-x-6 top-0 h-px ${a.cardBorder.replace("border-", "bg-")} opacity-70`}
      />

      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-bh-md border ${a.iconWrap}`}
      >
        <Icon className="h-5 w-5" />
      </span>

      <h3 className="font-bh-heading text-lg font-bold leading-[1.2] text-bh-fg-1">
        {value.title}
      </h3>
      <p className="text-sm leading-[1.6] text-bh-fg-3">{value.description}</p>
    </article>
  );
}
