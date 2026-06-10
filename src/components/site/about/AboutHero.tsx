// src/components/site/about/AboutHero.tsx
// Hero de la página /about — copy + CTA + slot reservado para foto real.
// Reutiliza tokens y micro-animaciones del DS (bh-animate-in / bh-card-lift).

import Image from "next/image";
import { ArrowRight, MessageCircle, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { getAboutHero } from "./data";

export default async function AboutHero() {
  const t = await getTranslations("about");
  const hero = getAboutHero(t);

  return (
    <section className="relative pt-6 md:pt-10">
      <div className="grid items-stretch gap-10 md:grid-cols-[1.1fr_1fr] md:gap-12">
        {/* Left — copy + CTA */}
        <div className="flex flex-col">
          <span className="bh-animate-in inline-flex w-fit items-center gap-2 rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
            <Users className="h-3 w-3" />
            {hero.eyebrow}
          </span>

          <h1 className="bh-animate-in bh-animate-d1 mt-5 font-bh-display text-4xl font-black uppercase leading-[0.95] tracking-[-0.01em] text-bh-fg-1 md:text-[3.25rem] lg:text-[3.5rem]">
            {hero.title.line1}{" "}
            <span className="text-bh-lime">{hero.title.highlight}</span>
            <br />
            {hero.title.line2}
          </h1>

          <p className="bh-animate-in bh-animate-d2 mt-5 max-w-[520px] text-[15px] leading-[1.65] text-bh-fg-3">
            {hero.description}
          </p>

          <div className="bh-animate-in bh-animate-d3 mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={hero.primaryCta.href}
              className="inline-flex items-center gap-2 rounded-bh-md bg-bh-lime px-6 py-3 text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
            >
              {hero.primaryCta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={hero.secondaryCta.href}
              className="inline-flex items-center gap-2 rounded-bh-md border border-bh-fg-4 px-6 py-3 text-sm font-semibold text-bh-fg-1 transition-colors duration-150 hover:bg-white/[0.06]"
            >
              {hero.secondaryCta.label}
              <MessageCircle className="h-4 w-4" />
            </Link>
          </div>

          {/* Wordmark + sello de confianza */}
          <div className="bh-animate-in bh-animate-d4 mt-auto flex items-end justify-between gap-4 pt-10">
            <div className="flex items-center gap-3">
              <Wordmark size="nav" />
              <span className="hidden text-[11px] uppercase tracking-[0.16em] text-bh-fg-3 sm:inline">
                {t("heroExtra.betaBadge")}
              </span>
            </div>
            <span className="inline-flex items-center gap-2 rounded-bh-pill border border-[rgba(0,194,255,0.22)] bg-[rgba(0,194,255,0.06)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-blue">
              {t("heroExtra.humanBadge")}
            </span>
          </div>
        </div>

        {/* Right — media slot (foto real del equipo / cancha) */}
        <figure className="bh-animate-in bh-animate-d2 bh-card-lift relative aspect-[4/5] w-full overflow-hidden rounded-bh-xl border border-white/[0.08] bg-bh-surface-1 backdrop-blur-md md:aspect-auto md:min-h-[520px]">
          {hero.imageSrc ? (
            <Image
              src={hero.imageSrc}
              alt={hero.imageAlt}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <BrandPanel />
          )}

          {/* Overlay degradado para legibilidad del badge */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bh-black/85 via-bh-black/10 to-transparent"
          />

          {/* Badge inferior con hitos clave del proyecto */}
          <figcaption className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
            <div className="rounded-bh-md border border-white/[0.10] bg-bh-black/55 px-4 py-3 backdrop-blur-md">
              <div className="font-bh-display text-2xl font-black leading-none text-bh-lime">
                {t("heroExtra.figureStartValue")}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-bh-fg-2">
                {t("heroExtra.figureStartLabel")}
              </div>
            </div>
            <div className="rounded-bh-md border border-white/[0.10] bg-bh-black/55 px-4 py-3 backdrop-blur-md">
              <div className="font-bh-display text-2xl font-black leading-none text-bh-blue">
                {t("heroExtra.figureLaunchValue")}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-bh-fg-2">
                {t("heroExtra.figureLaunchLabel")}
              </div>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ---------------------------------------------- */
/* Panel de marca — placeholder mientras no exista  */
/* foto real del equipo. Muestra el isotipo + el    */
/* wordmark como lockup intencional, no un hueco.    */
/* ---------------------------------------------- */
function BrandPanel() {
  return (
    <div className="absolute inset-0">
      {/* Mesh gradient corporativo */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 30% 25%, rgba(204,255,0,0.18) 0%, transparent 65%), radial-gradient(ellipse 60% 70% at 75% 75%, rgba(0,194,255,0.14) 0%, transparent 65%), linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      {/* Grid mesh */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
        }}
      />
      {/* Isotipo + wordmark centrados */}
      <div className="relative flex h-full flex-col items-center justify-center gap-5 px-8 pb-20">
        <div
          role="img"
          aria-label="'BallersHub"
          className="h-28 w-28 md:h-36 md:w-36"
          style={{
            backgroundImage: "url(/images/logo/isotipo-lime.svg)",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "contain",
            filter: "drop-shadow(0 0 32px rgba(204,255,0,0.30))",
          }}
        />
        <Wordmark size="hero" className="text-center" />
      </div>
    </div>
  );
}
