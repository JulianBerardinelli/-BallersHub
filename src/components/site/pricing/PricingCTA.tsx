import { ArrowRightCircle, MessageSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Reveal } from "./Reveal";

export default async function PricingCTA() {
  const t = await getTranslations("pricing");

  return (
    <Reveal>
      <section className="relative overflow-hidden rounded-bh-xl border border-[rgba(204,255,0,0.18)] bg-bh-surface-1 p-8 md:p-12">
        <div
          aria-hidden
          className="bh-grid-faint pointer-events-none absolute inset-0"
          style={{
            maskImage:
              "radial-gradient(ellipse 90% 90% at 50% 50%, black 0%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 90% 90% at 50% 50%, black 0%, transparent 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 90% at 0% 50%, rgba(204,255,0,0.12) 0%, transparent 70%), radial-gradient(ellipse 50% 80% at 100% 50%, rgba(0,194,255,0.10) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3 backdrop-blur-md">
              {t("cta.badge")}
            </span>
            <h2 className="font-bh-display text-3xl font-black uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
              <span className="bh-text-shimmer-blue">{t("cta.title")}</span>
            </h2>
            <p className="max-w-[520px] text-sm leading-[1.6] text-bh-fg-3">
              {t("cta.description")}
            </p>
          </div>

          <div className="flex flex-col gap-2 md:flex-row">
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-bh-md bg-bh-lime px-6 py-3 text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
            >
              {t("cta.signup")}
              <ArrowRightCircle className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-bh-md border border-white/[0.12] px-6 py-3 text-sm font-semibold text-bh-fg-1 transition-colors duration-150 hover:bg-white/[0.06]"
            >
              <MessageSquare className="h-4 w-4" />
              {t("cta.contact")}
            </Link>
          </div>
        </div>
      </section>
    </Reveal>
  );
}
