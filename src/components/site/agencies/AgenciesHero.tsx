// /agencies — marketing hero. Server component (no client JS): the H1 + copy
// + CTAs ship in the SSR HTML, keeping the page crawlable.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function AgenciesHero({ count }: { count: number }) {
  const t = await getTranslations("agenciesPage");
  return (
    <section className="relative overflow-hidden rounded-bh-xl border border-[rgba(204,255,0,0.18)] bg-bh-surface-1 px-6 py-12 md:px-12 md:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 90% at 0% 0%, rgba(204,255,0,0.10) 0%, transparent 70%), radial-gradient(ellipse 50% 80% at 100% 100%, rgba(0,194,255,0.08) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 max-w-2xl space-y-5">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
          {t("hero.eyebrow")}
        </span>
        <h1 className="font-bh-display text-4xl font-bold uppercase leading-[1.03] tracking-[-0.01em] text-bh-fg-1 md:text-5xl">
          {t("hero.title")}
        </h1>
        <p className="max-w-xl text-sm leading-[1.6] text-bh-fg-3 md:text-base">
          {t("hero.subtitle", { brand: "'BallersHub" })}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center gap-2 rounded-bh-md bg-bh-lime px-6 py-3 text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
          >
            {t("hero.ctaPrimary")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {count > 0 && (
            <Link
              href="#agencias"
              className="inline-flex items-center gap-2 rounded-bh-md border border-bh-fg-4 px-6 py-3 text-sm font-semibold text-bh-fg-2 transition-colors hover:border-bh-lime/40 hover:text-bh-fg-1"
            >
              {t("hero.ctaSecondary")}
            </Link>
          )}
        </div>
        {count > 0 && (
          <p className="pt-1 text-xs uppercase tracking-[0.12em] text-bh-fg-4">
            {t("hero.verifiedCount", { count })}
          </p>
        )}
      </div>
    </section>
  );
}
