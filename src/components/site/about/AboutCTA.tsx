// src/components/site/about/AboutCTA.tsx
// CTA final de la página /about — gemelo en lenguaje del CallToActionBanner del home,
// pero con dos acciones (registro + contacto) y textura de cancha sutil.

import Link from "next/link";
import { ArrowRightCircle, MessageCircle } from "lucide-react";

import { ABOUT_CTA } from "./data";

export default function AboutCTA() {
  return (
    <section className="relative overflow-hidden rounded-bh-xl border border-[rgba(204,255,0,0.18)] bg-bh-surface-1 p-8 md:p-12">
      {/* Glow corporativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 90% at 0% 50%, rgba(204,255,0,0.10) 0%, transparent 70%), radial-gradient(ellipse 50% 80% at 100% 50%, rgba(0,194,255,0.08) 0%, transparent 70%)",
        }}
      />
      {/* Textura cancha sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage: "url(/images/pack/textures/grass_1.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
            {ABOUT_CTA.eyebrow}
          </span>
          <h2 className="font-bh-display text-3xl font-black uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
            {ABOUT_CTA.title}
          </h2>
          <p className="max-w-[560px] text-sm leading-[1.6] text-bh-fg-3">
            {ABOUT_CTA.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={ABOUT_CTA.primaryCta.href}
            className="inline-flex shrink-0 items-center gap-2 rounded-bh-md bg-bh-lime px-6 py-3 text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
          >
            {ABOUT_CTA.primaryCta.label}
            <ArrowRightCircle className="h-5 w-5" />
          </Link>
          <Link
            href={ABOUT_CTA.secondaryCta.href}
            className="inline-flex shrink-0 items-center gap-2 rounded-bh-md border border-bh-fg-4 px-6 py-3 text-sm font-semibold text-bh-fg-1 transition-colors duration-150 hover:bg-white/[0.06]"
          >
            {ABOUT_CTA.secondaryCta.label}
            <MessageCircle className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
