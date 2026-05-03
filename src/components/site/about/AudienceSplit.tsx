// src/components/site/about/AudienceSplit.tsx
// Sección "Para quién lo construimos" — dos grupos:
//   1. PRIMARY (crean portfolio): Jugadores (audiencia principal, card grande) + Agencias.
//   2. SECONDARY (descubren talento): Clubes, Fans, Periodistas.
// Toda la copy vive en data.ts → tocar contenido nunca toca la UI.

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import SectionHeader from "./SectionHeader";
import {
  ACCENT_STYLES,
  AUDIENCES_HEADER,
  AUDIENCES_PRIMARY,
  AUDIENCES_SECONDARY,
  type Audience,
} from "./data";

export default function AudienceSplit() {
  const [hero, agency] = AUDIENCES_PRIMARY;

  return (
    <section className="space-y-12">
      <SectionHeader
        eyebrow={AUDIENCES_HEADER.eyebrow}
        title={
          <>
            {AUDIENCES_HEADER.title.plain}{" "}
            <span className="text-bh-lime">
              {AUDIENCES_HEADER.title.highlight}
            </span>
          </>
        }
        description={AUDIENCES_HEADER.description}
      />

      {/* Group 1: Crean portfolio (usuarios) */}
      <div className="space-y-5">
        <GroupLabel
          label={AUDIENCES_HEADER.primaryGroupTitle}
          accent="lime"
        />

        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <PrimaryCard audience={hero} hero />
          <PrimaryCard audience={agency} />
        </div>
      </div>

      {/* Group 2: Descubren talento (audiencias secundarias) */}
      <div className="space-y-5">
        <GroupLabel
          label={AUDIENCES_HEADER.secondaryGroupTitle}
          accent="blue"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES_SECONDARY.map((audience) => (
            <SecondaryCard key={audience.id} audience={audience} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------- */
/* Sub-componentes                                */
/* ---------------------------------------------- */
function GroupLabel({
  label,
  accent,
}: {
  label: string;
  accent: "lime" | "blue";
}) {
  const a = ACCENT_STYLES[accent];
  return (
    <div className="flex items-center gap-3">
      <span className={`h-px flex-1 ${a.cardBorder.replace("border-", "bg-")}`} />
      <span
        className={`inline-flex items-center gap-2 rounded-bh-pill border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${a.tagBg} ${a.tagText} ${a.tagBorder}`}
      >
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${a.dot}`} />
        {label}
      </span>
      <span className={`h-px flex-1 ${a.cardBorder.replace("border-", "bg-")}`} />
    </div>
  );
}

function PrimaryCard({
  audience,
  hero = false,
}: {
  audience: Audience;
  hero?: boolean;
}) {
  const Icon = audience.icon;
  const a = ACCENT_STYLES[audience.accent];

  return (
    <article
      className={`bh-card-lift group relative flex h-full flex-col gap-5 overflow-hidden rounded-bh-xl border ${a.cardBorder} bg-bh-surface-1 p-6 md:p-8 ${a.cardShadow}`}
    >
      {/* Glow corporativo */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl ${a.cardBg} opacity-80`}
      />
      {/* Grid mesh sutil */}
      {hero ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage:
              "radial-gradient(ellipse 80% 80% at 30% 30%, black 30%, transparent 90%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 80% at 30% 30%, black 30%, transparent 90%)",
          }}
        />
      ) : null}

      <div className="relative flex items-center justify-between">
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-bh-md border ${a.iconWrap}`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-bh-pill border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${a.tagBg} ${a.tagText} ${a.tagBorder}`}
        >
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${a.dot}`} />
          {audience.subtitle}
        </span>
      </div>

      <h3
        className={`relative font-bh-display ${
          hero ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"
        } font-black uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1`}
      >
        {audience.title}
      </h3>

      <p className="relative text-sm leading-[1.65] text-bh-fg-3 md:text-[15px]">
        {audience.description}
      </p>

      {audience.bullets && audience.bullets.length > 0 ? (
        <ul className="relative grid gap-2.5">
          {audience.bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-2.5 text-[13px] leading-[1.5] text-bh-fg-2"
            >
              <CheckCircle2
                className={`mt-0.5 h-4 w-4 shrink-0 ${a.text}`}
                aria-hidden
              />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {audience.cta ? (
        <div className="relative mt-auto pt-2">
          <Link
            href={audience.cta.href}
            className={
              audience.accent === "lime"
                ? "inline-flex items-center gap-2 rounded-bh-md bg-bh-lime px-5 py-2.5 text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.30)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
                : "inline-flex items-center gap-2 rounded-bh-md border border-[rgba(0,194,255,0.35)] bg-[rgba(0,194,255,0.08)] px-5 py-2.5 text-sm font-semibold text-bh-blue transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[rgba(0,194,255,0.14)]"
            }
          >
            {audience.cta.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function SecondaryCard({ audience }: { audience: Audience }) {
  const Icon = audience.icon;
  const a = ACCENT_STYLES[audience.accent];

  return (
    <article className="bh-card-lift group relative flex h-full flex-col gap-3 overflow-hidden rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
      {/* Línea acento superior */}
      <span
        aria-hidden
        className={`absolute inset-x-5 top-0 h-px ${a.cardBorder.replace("border-", "bg-")} opacity-70`}
      />

      <div className="flex items-center justify-between">
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-bh-md border ${a.iconWrap}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${a.tagText}`}
        >
          {audience.subtitle}
        </span>
      </div>

      <h3 className="font-bh-heading text-base font-bold leading-[1.2] text-bh-fg-1">
        {audience.title}
      </h3>
      <p className="text-[13px] leading-[1.6] text-bh-fg-3">
        {audience.description}
      </p>
    </article>
  );
}
