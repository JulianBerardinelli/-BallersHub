// src/components/site/about/AboutHero.tsx
// Hero de la página /about — copy + CTA + slot reservado para foto real.
// Reutiliza tokens y micro-animaciones del DS (bh-animate-in / bh-card-lift).

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle, Users } from "lucide-react";

import { Wordmark } from "@/components/brand/Wordmark";
import { ABOUT_HERO } from "./data";

export default function AboutHero() {
  return (
    <section className="relative pt-6 md:pt-10">
      <div className="grid items-stretch gap-10 md:grid-cols-[1.1fr_1fr] md:gap-12">
        {/* Left — copy + CTA */}
        <div className="flex flex-col">
          <span className="bh-animate-in inline-flex w-fit items-center gap-2 rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
            <Users className="h-3 w-3" />
            {ABOUT_HERO.eyebrow}
          </span>

          <h1 className="bh-animate-in bh-animate-d1 mt-5 font-bh-display text-4xl font-black uppercase leading-[0.95] tracking-[-0.01em] text-bh-fg-1 md:text-[3.25rem] lg:text-[3.5rem]">
            {ABOUT_HERO.title.line1}{" "}
            <span className="text-bh-lime">{ABOUT_HERO.title.highlight}</span>
            <br />
            {ABOUT_HERO.title.line2}
          </h1>

          <p className="bh-animate-in bh-animate-d2 mt-5 max-w-[520px] text-[15px] leading-[1.65] text-bh-fg-3">
            {ABOUT_HERO.description}
          </p>

          <div className="bh-animate-in bh-animate-d3 mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={ABOUT_HERO.primaryCta.href}
              className="inline-flex items-center gap-2 rounded-bh-md bg-bh-lime px-6 py-3 text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
            >
              {ABOUT_HERO.primaryCta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={ABOUT_HERO.secondaryCta.href}
              className="inline-flex items-center gap-2 rounded-bh-md border border-bh-fg-4 px-6 py-3 text-sm font-semibold text-bh-fg-1 transition-colors duration-150 hover:bg-white/[0.06]"
            >
              {ABOUT_HERO.secondaryCta.label}
              <MessageCircle className="h-4 w-4" />
            </Link>
          </div>

          {/* Wordmark + sello de confianza */}
          <div className="bh-animate-in bh-animate-d4 mt-auto flex items-end justify-between gap-4 pt-10">
            <div className="flex items-center gap-3">
              <Wordmark size="nav" />
              <span className="hidden text-[11px] uppercase tracking-[0.16em] text-bh-fg-3 sm:inline">
                Beta · Lanzamiento Jun 2026
              </span>
            </div>
            <span className="inline-flex items-center gap-2 rounded-bh-pill border border-[rgba(0,194,255,0.22)] bg-[rgba(0,194,255,0.06)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-blue">
              Validados por humanos
            </span>
          </div>
        </div>

        {/* Right — media slot (foto real del equipo / cancha) */}
        <figure className="bh-animate-in bh-animate-d2 bh-card-lift relative aspect-[4/5] w-full overflow-hidden rounded-bh-xl border border-white/[0.08] bg-bh-surface-1 backdrop-blur-md md:aspect-auto md:min-h-[520px]">
          {/* Imagen real (cuando se cargue desde /public/images/about/) */}
          {ABOUT_HERO.imageSrc ? (
            <Image
              src={ABOUT_HERO.imageSrc}
              alt={ABOUT_HERO.imageAlt}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <PlaceholderArtwork />
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
                Ago 2025
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-bh-fg-2">
                Arranque del proyecto
              </div>
            </div>
            <div className="rounded-bh-md border border-white/[0.10] bg-bh-black/55 px-4 py-3 backdrop-blur-md">
              <div className="font-bh-display text-2xl font-black leading-none text-bh-blue">
                Jun 2026
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-bh-fg-2">
                Lanzamiento oficial
              </div>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ---------------------------------------------- */
/* Placeholder visual mientras no exista foto real */
/* ---------------------------------------------- */
function PlaceholderArtwork() {
  return (
    <div className="absolute inset-0">
      {/* Textura sutil de cancha (asset ya disponible en /public/images/pack/textures) */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage: "url(/images/pack/textures/grass_2.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
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
      {/* Tag superior — indica que es slot para imagen real */}
      <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-bh-pill border border-white/[0.10] bg-bh-black/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-bh-fg-2 backdrop-blur-md">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-bh-lime" />
        Foto del equipo
      </div>
    </div>
  );
}
