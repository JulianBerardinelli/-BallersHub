import { Sparkles } from "lucide-react";

export default function PricingHero() {
  return (
    <section className="relative pt-2 md:pt-6">
      <div className="relative mx-auto max-w-3xl text-center">
        <span className="bh-animate-in inline-flex items-center gap-1.5 rounded-bh-pill border border-bh-fg-4 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3 backdrop-blur-md">
          <Sparkles className="h-3 w-3 text-bh-lime" />
          Planes &amp; precios
        </span>

        <h1 className="bh-animate-in bh-animate-d1 mt-6 font-bh-display text-4xl font-black uppercase leading-[0.95] tracking-[-0.01em] text-bh-fg-1 md:text-[3.75rem] lg:text-[4.25rem]">
          Elegí el plan que <br className="hidden md:block" />
          <span className="bh-text-shimmer">acelera tu carrera</span>
        </h1>

        <p className="bh-animate-in bh-animate-d2 mx-auto mt-6 max-w-[560px] text-[15px] leading-[1.65] text-bh-fg-3">
          Dos formas de potenciar tu visibilidad en &apos;BallersHub.
          Empezá gratis y cuando estés listo, sumá Pro para desbloquear
          plantilla pro, métricas, reviews y mucho más.
        </p>
      </div>
    </section>
  );
}
