import { getTranslations } from "next-intl/server";

import { Reveal, RevealItem, RevealStagger } from "./Reveal";

export default async function PricingFAQ() {
  const t = await getTranslations("pricing");
  const faqs = [1, 2, 3, 4].map((n) => ({
    n,
    q: t(`faq.q${n}`),
    a: t(`faq.a${n}`),
  }));

  return (
    <section className="relative">
      <Reveal className="mx-auto mb-10 max-w-xl text-center">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3 backdrop-blur-md">
          {t("faq.badge")}
        </span>
        <h2 className="mt-4 font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          {t("faq.title")}
        </h2>
      </Reveal>

      <RevealStagger
        className="mx-auto grid max-w-4xl gap-3 md:grid-cols-2"
        stagger={0.06}
        initialDelay={0.08}
      >
        {faqs.map(({ n, q, a }) => (
          <RevealItem key={n}>
            <details className="group rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5 transition-colors duration-150 hover:border-white/[0.16] open:border-[rgba(204,255,0,0.25)] open:bg-[rgba(204,255,0,0.03)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-semibold text-bh-fg-1 [&::-webkit-details-marker]:hidden">
                {q}
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.12] text-bh-fg-3 transition-transform duration-200 group-open:rotate-45 group-open:border-[rgba(204,255,0,0.35)] group-open:text-bh-lime"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-[13px] leading-[1.6] text-bh-fg-3">{a}</p>
            </details>
          </RevealItem>
        ))}
      </RevealStagger>
    </section>
  );
}
