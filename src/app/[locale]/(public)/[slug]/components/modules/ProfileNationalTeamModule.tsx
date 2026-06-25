"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import CountryFlag from "@/components/common/CountryFlag";
import CountUp from "@/components/ui/CountUp";
import type {
  NationalTeamAgeCategory,
  NationalTeamParticipation,
} from "@/db/schema/nationalTeams";

import GalleryPhotoCard from "./gallery/GalleryPhotoCard";
import GalleryLightbox from "./gallery/GalleryLightbox";
import { getGalleryLayout } from "./gallery/galleryLayouts";
import type { GalleryPhoto } from "./gallery/types";

type Stint = {
  id: string;
  countryCode: string | null;
  teamName: string | null;
  crestUrl: string | null;
  ageCategory: NationalTeamAgeCategory;
  participation: NationalTeamParticipation;
  startYear: number | null;
  endYear: number | null;
  description: string | null;
  highlights: string[];
  caps: number | null;
  goals: number | null;
  assists: number | null;
  minutes: number | null;
};

type Photo = { id: string; url: string; title: string | null; altText: string | null };

type Labels = {
  title: string;
  subtitle: string;
  current: string;
  callups: string;
  scrollHint: string;
  ageCategory: Record<NationalTeamAgeCategory, string>;
  participation: Record<NationalTeamParticipation, string>;
};

// Más de 5 convocatorias → timeline auto-scrolleado (solo en desktop). 5 o menos
// → timeline estático con puntos.
const ANIMATE_THRESHOLD = 5;

// ----------------------------------------------------------------------------

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return isDesktop;
}

function periodOf(s: Stint, current: string): string | null {
  if (!s.startYear && !s.endYear) return null;
  if (s.startYear && s.endYear) return s.startYear === s.endYear ? `${s.startYear}` : `${s.startYear}–${s.endYear}`;
  return `${s.startYear ?? ""}${s.startYear ? "–" : ""}${s.endYear ?? current}`;
}

// ----------------------------------------------------------------------------
// Una convocatoria (card compartida por ambos timelines)
// ----------------------------------------------------------------------------

function ConvocatoriaCard({ stint, labels }: { stint: Stint; labels: Labels }) {
  const period = periodOf(stint, labels.current);
  const stats = (
    [
      ["PJ", stint.caps],
      ["G", stint.goals],
      ["A", stint.assists],
      ["Min", stint.minutes],
    ] as const
  ).filter(([, v]) => v != null && v !== 0);

  return (
    <div className="relative rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-xl ring-1 ring-white/5 shadow-[inset_0_0_50px_rgba(255,255,255,0.02)]">
      <div className="absolute right-[-30px] top-[-30px] h-28 w-28 rounded-full bg-[var(--theme-primary)] opacity-[0.08] blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          {period ? (
            <span className="font-heading text-xs font-black tracking-[0.18em] text-[var(--theme-primary)]">
              {period}
            </span>
          ) : null}
          <h4 className="mt-0.5 font-heading text-lg font-black uppercase leading-tight text-white">
            {labels.ageCategory[stint.ageCategory]}
          </h4>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {stint.countryCode ? <CountryFlag code={stint.countryCode} size={15} /> : null}
            <span className="font-body text-[11px] font-semibold uppercase tracking-wider text-white/55">
              {stint.teamName ?? labels.title}
            </span>
            <span className="rounded-full bg-[var(--theme-accent)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-accent)]">
              {labels.participation[stint.participation]}
            </span>
          </div>
        </div>
        {stint.crestUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stint.crestUrl} alt="" className="h-9 w-9 shrink-0 rounded object-contain opacity-90" />
        ) : null}
      </div>

      {stint.description ? (
        <p className="relative mt-2.5 font-body text-[13px] leading-relaxed text-white/65">
          {stint.description}
        </p>
      ) : null}

      {stint.highlights.length > 0 ? (
        <div className="relative mt-2.5 flex flex-wrap gap-1.5">
          {stint.highlights.map((h) => (
            <span
              key={h}
              className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60"
            >
              {h}
            </span>
          ))}
        </div>
      ) : null}

      {stats.length > 0 ? (
        <div className="relative mt-3 flex flex-wrap gap-4">
          {stats.map(([lbl, v]) => (
            <span key={lbl} className="font-body text-xs text-white/55">
              <span className="font-heading text-base font-black text-white">{v}</span> {lbl}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Timeline estático (≤ 5): línea vertical + puntos
// ----------------------------------------------------------------------------

function StaticTimeline({ stints, labels }: { stints: Stint[]; labels: Labels }) {
  return (
    <div className="relative">
      <div className="absolute bottom-2 left-[7px] top-2 w-[2px] rounded-full bg-gradient-to-b from-[var(--theme-primary)]/60 via-white/10 to-transparent" />
      <div className="flex flex-col gap-5">
        {stints.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "0px 0px -80px 0px" }}
            transition={{ duration: 0.45, delay: i * 0.05 }}
            className="relative pl-8"
          >
            <span className="absolute left-0 top-3 z-10 h-4 w-4 -translate-x-[1px] rounded-full border-[3px] border-[var(--theme-background)] bg-[var(--theme-primary)] shadow-[0_0_14px_var(--theme-primary)]" />
            <ConvocatoriaCard stint={s} labels={labels} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Timeline animado (> 5, desktop): auto-scroll lento, hover pausa + scroll
// manual (overscroll-contain), fades en los bordes, zoom al centro.
// ----------------------------------------------------------------------------

function AnimatedTimeline({ stints, labels }: { stints: Stint[]; labels: Labels }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement[]>([]);
  const pausedRef = useRef(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    let raf = 0;
    const SPEED = 0.45; // px/frame ≈ 27px/s — lento

    const updateZoom = () => {
      const cRect = container.getBoundingClientRect();
      const center = cRect.top + cRect.height / 2;
      const half = cRect.height / 2;
      for (const el of itemsRef.current) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const d = Math.min(Math.abs(r.top + r.height / 2 - center) / half, 1);
        el.style.transform = `scale(${1 - d * 0.16})`;
        el.style.opacity = `${1 - d * 0.55}`;
      }
    };

    const frame = () => {
      if (!pausedRef.current) {
        const max = container.scrollHeight - container.clientHeight;
        if (container.scrollTop >= max - 0.5) {
          container.scrollTop = 0; // loop continuo por toda la trayectoria
        } else {
          container.scrollTop += SPEED;
        }
      }
      updateZoom();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [stints.length]);

  return (
    <div className="relative">
      {/* Línea vertical de fondo */}
      <div className="pointer-events-none absolute bottom-0 left-[7px] top-0 z-0 w-[2px] rounded-full bg-white/10" />
      <div
        ref={scrollRef}
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        className="scrollbar-hide relative z-10 h-[58vh] max-h-[560px] overflow-y-auto overscroll-contain"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
        }}
      >
        {/* padding arriba/abajo para que el primer y último item puedan centrarse */}
        <div className="flex flex-col gap-5 py-[26vh]">
          {stints.map((s, i) => (
            <div
              key={s.id}
              ref={(el) => {
                if (el) itemsRef.current[i] = el;
              }}
              className="relative pl-8 will-change-transform"
              style={{ transformOrigin: "left center" }}
            >
              <span className="absolute left-0 top-3 z-10 h-4 w-4 -translate-x-[1px] rounded-full border-[3px] border-[var(--theme-background)] bg-[var(--theme-primary)] shadow-[0_0_14px_var(--theme-primary)]" />
              <ConvocatoriaCard stint={s} labels={labels} />
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-center font-body text-[10px] font-medium uppercase tracking-[0.25em] text-white/30">
        {labels.scrollHint}
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Imágenes (1–4) — reusa la grid + card + lightbox de la galería
// ----------------------------------------------------------------------------

function NationalTeamImages({ photos, playerName }: { photos: Photo[]; playerName: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const galleryPhotos: GalleryPhoto[] = photos.map((p) => ({
    id: p.id,
    url: p.url,
    title: p.title,
    altText: p.altText,
  }));
  const layout = getGalleryLayout(galleryPhotos.length);

  if (galleryPhotos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-12 gap-3 md:gap-4">
        {galleryPhotos.map((photo, i) => (
          <GalleryPhotoCard
            key={photo.id}
            photo={photo}
            slot={layout[i] ?? layout[layout.length - 1]}
            index={i}
            playerName={playerName}
            onOpen={setActiveIndex}
          />
        ))}
      </div>
      <GalleryLightbox
        photos={galleryPhotos}
        index={activeIndex}
        playerName={playerName}
        onClose={() => setActiveIndex(null)}
        onChange={setActiveIndex}
      />
    </>
  );
}

// ----------------------------------------------------------------------------
// Módulo
// ----------------------------------------------------------------------------

export default function ProfileNationalTeamModule({
  stints,
  photos,
  labels,
  playerName,
}: {
  stints: Stint[];
  photos: Photo[];
  labels: Labels;
  playerName: string;
}) {
  const isDesktop = useIsDesktop();

  // Orden cronológico (más antigua arriba) para recorrer la trayectoria de arriba a abajo.
  const sorted = useMemo(
    () => [...stints].sort((a, b) => (a.startYear ?? 0) - (b.startYear ?? 0)),
    [stints],
  );

  const totals = useMemo(
    () =>
      stints.reduce(
        (acc, s) => {
          acc.caps += s.caps ?? 0;
          acc.goals += s.goals ?? 0;
          return acc;
        },
        { caps: 0, goals: 0 },
      ),
    [stints],
  );

  // Selección principal + banderas distintas (puede tener dual nacionalidad).
  const distinctCountries = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of stints) {
      const c = s.countryCode;
      if (c && !seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
    return out;
  }, [stints]);
  const primaryName = stints[0]?.teamName ?? labels.title;

  const useAnimated = isDesktop && sorted.length > ANIMATE_THRESHOLD;

  return (
    <section
      id="national-team"
      className="relative w-full overflow-hidden py-20 font-sans lg:flex lg:h-screen lg:items-center lg:py-0"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute left-1/2 top-1/3 h-[55vw] max-h-[760px] w-[55vw] max-w-[760px] -translate-x-1/2 rounded-full bg-[var(--theme-accent)]/[0.05] blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-col px-5 lg:max-h-screen lg:justify-center lg:px-8">
        {/* Header */}
        <header className="mb-7 shrink-0 lg:mb-9">
          <p className="mb-1.5 font-heading text-[10px] font-black uppercase tracking-[0.4em] text-[var(--theme-accent)]">
            {labels.subtitle}
          </p>
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div>
              <h2 className="font-heading text-4xl font-black uppercase leading-[0.9] text-white drop-shadow-2xl md:text-5xl lg:text-6xl">
                {labels.title}
              </h2>
              <div className="mt-3 flex items-center gap-2">
                {distinctCountries.slice(0, 3).map((code) => (
                  <CountryFlag key={code} code={code} size={24} />
                ))}
                <span className="font-body text-sm font-semibold uppercase tracking-wider text-white/65">
                  {primaryName}
                </span>
              </div>
            </div>

            {/* Contadores */}
            <div className="flex items-stretch gap-3">
              <Stat value={sorted.length} label={labels.callups} accent="primary" />
              {totals.caps > 0 ? <Stat value={totals.caps} label="PJ" accent="accent" /> : null}
              {totals.goals > 0 ? <Stat value={totals.goals} label="Goles" accent="accent" /> : null}
            </div>
          </div>
        </header>

        {/* Dos columnas */}
        <div className="grid min-h-0 gap-7 lg:grid-cols-[1.12fr_1fr] lg:gap-12">
          {/* Timeline */}
          <div className="min-h-0">
            {useAnimated ? (
              <AnimatedTimeline stints={sorted} labels={labels} />
            ) : (
              <StaticTimeline stints={sorted} labels={labels} />
            )}
          </div>

          {/* Imágenes */}
          {photos.length > 0 ? (
            <div className="min-h-0 lg:flex lg:items-center">
              <div className="w-full">
                <NationalTeamImages photos={photos} playerName={playerName} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent: "primary" | "accent";
}) {
  const color = accent === "primary" ? "var(--theme-primary)" : "var(--theme-accent)";
  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 backdrop-blur-xl">
      <CountUp value={value} className="font-heading text-2xl font-black leading-none md:text-3xl" style={{ color }} />
      <span className="mt-1 font-body text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
        {label}
      </span>
    </div>
  );
}
