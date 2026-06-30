"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLenis } from "lenis/react";

import CountryFlag from "@/components/common/CountryFlag";
import CountUp from "@/components/ui/CountUp";
import type {
  NationalTeamAgeCategory,
  NationalTeamParticipation,
} from "@/db/schema/nationalTeams";

import GalleryPhotoCard from "./gallery/GalleryPhotoCard";
import GalleryLightbox from "./gallery/GalleryLightbox";
import { getGalleryLayout } from "./gallery/galleryLayouts";
import type { GalleryLayout, GalleryPhoto } from "./gallery/types";

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

type StatLabels = { caps: string; goals: string; assists: string; minutes: string };

type Labels = {
  title: string;
  subtitle: string;
  current: string;
  callups: string;
  scrollHint: string;
  navPrev: string;
  navNext: string;
  ageCategory: Record<NationalTeamAgeCategory, string>;
  participation: Record<NationalTeamParticipation, string>;
  stats: StatLabels;
};

// 3+ convocatorias → timeline auto-scrolleado y ACOTADO en altura (solo desktop);
// con 1–2 alcanza el timeline estático (entra en una pantalla sin desbordar).
// El cap de altura del scroller es clave: el estático con varias etapas se salía
// del `lg:h-screen` y quedaba clippeado.
const ANIMATE_THRESHOLD = 3;

// Velocidad del auto-scroll del timeline animado, en px/SEGUNDO. Es time-based
// (no por-frame) para que NO dependa del refresh rate: con `+= px/frame` una
// pantalla de 120Hz corría al doble. Lenta pero claramente animada; tuneable.
const AUTO_SCROLL_PX_PER_SEC = 22;

// Jerarquía de categorías para resolver la convocatoria "máxima" alcanzada
// (mayor número = más alta). Mayor > Olímpica > Sub-23 > … > Sub-15 > Otra.
const NT_CATEGORY_RANK: Record<NationalTeamAgeCategory, number> = {
  senior: 10,
  olympic: 9,
  sub23: 8,
  sub21: 7,
  sub20: 6,
  sub19: 5,
  sub18: 4,
  sub17: 3,
  sub16: 2,
  sub15: 1,
  other: 0,
};

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
// Caja de stat por etapa — mismo lenguaje visual que la grilla de stats del
// módulo de Trayectoria (glassmorphism + CountUp; goles en accent, asistencias
// en primary).
// ----------------------------------------------------------------------------

function StatBox({
  label,
  value,
  tone,
  suffix,
}: {
  label: string;
  value: number;
  tone: "neutral" | "accent" | "primary";
  suffix?: string;
}) {
  const color =
    tone === "accent" ? "var(--theme-accent)" : tone === "primary" ? "var(--theme-primary)" : "#ffffff";
  const bg =
    tone === "accent"
      ? "bg-[var(--theme-accent)]/[0.07]"
      : tone === "primary"
        ? "bg-[var(--theme-primary)]/[0.07]"
        : "bg-white/[0.03]";
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-white/5 ${bg} px-2 py-2`}>
      <span
        className="mb-0.5 font-body text-[8px] font-bold uppercase tracking-[0.15em]"
        style={{ color, opacity: tone === "neutral" ? 0.45 : 0.85 }}
      >
        {label}
      </span>
      <span className="font-heading text-lg font-black leading-none" style={{ color }}>
        <CountUp value={value} />
        {suffix ? <span className="ml-0.5 text-[11px] opacity-50">{suffix}</span> : null}
      </span>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Una convocatoria (card compartida por ambos timelines). Layout interno:
// info (izq) | stats de la etapa (der) → descripción debajo.
// ----------------------------------------------------------------------------

function ConvocatoriaCard({ stint, labels }: { stint: Stint; labels: Labels }) {
  const period = periodOf(stint, labels.current);

  const statItems = (
    [
      { key: "caps", label: labels.stats.caps, value: stint.caps, tone: "neutral" as const },
      { key: "goals", label: labels.stats.goals, value: stint.goals, tone: "accent" as const },
      { key: "assists", label: labels.stats.assists, value: stint.assists, tone: "primary" as const },
      { key: "minutes", label: labels.stats.minutes, value: stint.minutes, tone: "neutral" as const, suffix: "'" },
    ] as const
  ).filter((s) => s.value != null && s.value !== 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-xl ring-1 ring-white/5 shadow-[inset_0_0_50px_rgba(255,255,255,0.02)]">
      <div className="pointer-events-none absolute right-[-30px] top-[-30px] h-28 w-28 rounded-full bg-[var(--theme-primary)] opacity-[0.08] blur-3xl" />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Info */}
        <div className="min-w-0 flex-1">
          {period ? (
            <span className="inline-block rounded-md bg-[var(--theme-primary)] px-2 py-0.5 font-heading text-[11px] font-black tracking-wider text-white shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
              {period}
            </span>
          ) : null}
          <h4 className="mt-1.5 font-heading text-lg font-black uppercase leading-tight text-white">
            {labels.ageCategory[stint.ageCategory]}
          </h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {stint.countryCode ? <CountryFlag code={stint.countryCode} size={15} /> : null}
            {stint.crestUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stint.crestUrl} alt="" className="h-5 w-5 shrink-0 rounded object-contain opacity-90" />
            ) : null}
            <span className="font-body text-[11px] font-semibold uppercase tracking-wider text-white/55">
              {stint.teamName ?? labels.title}
            </span>
            <span className="rounded-full bg-[var(--theme-accent)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-accent)]">
              {labels.participation[stint.participation]}
            </span>
          </div>
        </div>

        {/* Stats de la etapa */}
        {statItems.length > 0 ? (
          <div className="grid w-full grid-cols-2 gap-1.5 sm:w-[206px] sm:shrink-0">
            {statItems.map((s) => (
              <StatBox
                key={s.key}
                label={s.label}
                value={s.value as number}
                tone={s.tone}
                suffix={"suffix" in s ? s.suffix : undefined}
              />
            ))}
          </div>
        ) : null}
      </div>

      {stint.description ? (
        <p className="relative mt-3 font-body text-[13px] leading-relaxed text-white/65">
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
    </div>
  );
}

// ----------------------------------------------------------------------------
// Timeline estático (1–2 etapas): línea vertical + puntos
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
// Flecha minimalista de navegación (avanza 1 etapa por click).
// ----------------------------------------------------------------------------

function ArrowBtn({ dir, label, onClick }: { dir: "up" | "down"; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/40 text-[var(--theme-accent)]/80 backdrop-blur-md transition-all hover:border-[var(--theme-accent)]/40 hover:bg-black/60 hover:text-[var(--theme-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)]/60"
    >
      {dir === "up" ? <ChevronUp size={15} strokeWidth={2.5} /> : <ChevronDown size={15} strokeWidth={2.5} />}
    </button>
  );
}

// ----------------------------------------------------------------------------
// Timeline animado (3+ etapas, desktop): auto-scroll lento + control manual de la
// rueda (Lenis prevent + overscroll-contain), fades en los bordes, zoom al
// centro y flechas para saltar de a una etapa.
// ----------------------------------------------------------------------------

function AnimatedTimeline({ stints, labels }: { stints: Stint[]; labels: Labels }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement[]>([]);
  const pausedRef = useRef(false);
  const dirRef = useRef<1 | -1>(1); // sentido del auto-scroll (ping-pong)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lenis = useLenis();

  // Pausa el auto-scroll SÓLO durante interacción (rueda / flechas) y lo reanuda
  // tras un rato de quietud. A propósito NO se pausa por hover: al llegar
  // scrolleando, el cursor suele quedar quieto encima del timeline, y pausar ahí
  // hacía que la animación pareciera congelada (no se movía nunca).
  const pauseInteractive = () => {
    pausedRef.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      pausedRef.current = false;
    }, 1400);
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    let raf = 0;

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

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); // clamp tras tab inactivo
      last = now;
      if (!pausedRef.current) {
        const max = container.scrollHeight - container.clientHeight;
        if (max > 0) {
          // Ping-pong time-based: avanza px/seg, rebota e invierte el sentido al
          // tocar el final, y vuelve a bajar al volver al principio (sin el
          // salto a 0 del loop, que con listas cortas se notaba feo).
          let next = container.scrollTop + AUTO_SCROLL_PX_PER_SEC * dt * dirRef.current;
          if (next >= max) {
            next = max;
            dirRef.current = -1;
          } else if (next <= 0) {
            next = 0;
            dirRef.current = 1;
          }
          container.scrollTop = next;
        }
      }
      updateZoom();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [stints.length]);

  // Centra la etapa anterior/siguiente respecto del centro del contenedor.
  const scrollToStage = (dir: 1 | -1) => {
    const container = scrollRef.current;
    if (!container) return;
    pauseInteractive(); // navegación manual: pausa con auto-resume
    const cRect = container.getBoundingClientRect();
    const center = cRect.top + cRect.height / 2;

    let currentIdx = 0;
    let best = Infinity;
    itemsRef.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - center);
      if (d < best) {
        best = d;
        currentIdx = i;
      }
    });

    const targetIdx = Math.min(Math.max(currentIdx + dir, 0), itemsRef.current.length - 1);
    const target = itemsRef.current[targetIdx];
    if (!target) return;
    const tRect = target.getBoundingClientRect();
    const delta = tRect.top + tRect.height / 2 - center;
    const max = container.scrollHeight - container.clientHeight;
    const to = Math.max(0, Math.min(container.scrollTop + delta, max));
    animate(container.scrollTop, to, {
      duration: 0.55,
      ease: [0.32, 0.72, 0, 1],
      onUpdate: (v) => {
        container.scrollTop = v;
      },
    });
  };

  // La rueda controla el scroll interno (Lenis está prevenido sobre este
  // contenedor); sólo en los extremos encadenamos al scroll de la página.
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    pauseInteractive();
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const goingDown = e.deltaY > 0;
    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollTop >= max - 1;
    if ((goingDown && atBottom) || (!goingDown && atTop)) {
      if (lenis) lenis.scrollTo(window.scrollY + e.deltaY, { duration: 0.25 });
      else window.scrollBy({ top: e.deltaY });
    }
  };

  return (
    <div className="relative">
      {/* Línea vertical de fondo */}
      <div className="pointer-events-none absolute bottom-0 left-[7px] top-0 z-0 w-[2px] rounded-full bg-white/10" />
      <div
        ref={scrollRef}
        data-lenis-prevent
        onWheel={onWheel}
        className="scrollbar-hide relative z-10 h-[52vh] max-h-[500px] overflow-y-auto overscroll-contain"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
        }}
      >
        {/* padding arriba/abajo para que el primer y último item puedan centrarse */}
        <div className="flex flex-col gap-5 py-[24vh]">
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

      {/* Flechas de navegación — en el canal entre columnas (sólo desktop). */}
      <div className="absolute right-[-1.75rem] top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
        <ArrowBtn dir="up" label={labels.navPrev} onClick={() => scrollToStage(-1)} />
        <ArrowBtn dir="down" label={labels.navNext} onClick={() => scrollToStage(1)} />
      </div>

      <p className="mt-2 text-center font-body text-[10px] font-medium uppercase tracking-[0.25em] text-white/30">
        {labels.scrollHint}
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Imágenes (1–4) — reusa la card + lightbox de la galería, pero con un layout
// propio de aspectos bajos para que el bloque ocupe menos altura (más centrado).
// ----------------------------------------------------------------------------

const NT_PHOTO_SIZES = "(max-width: 1024px) 90vw, 30vw";

function ntPhotoLayout(count: number): GalleryLayout {
  switch (count) {
    case 1:
      return [{ col: "col-span-12", aspect: "aspect-[16/10]", sizes: NT_PHOTO_SIZES, depth: 0.5 }];
    case 2:
      return [
        { col: "col-span-6", aspect: "aspect-[4/5]", sizes: NT_PHOTO_SIZES, depth: 1.0 },
        { col: "col-span-6", aspect: "aspect-[4/5]", sizes: NT_PHOTO_SIZES, depth: 1.2 },
      ];
    case 3:
      return [
        { col: "col-span-12", aspect: "aspect-[16/9]", sizes: NT_PHOTO_SIZES, depth: 0.5 },
        { col: "col-span-6", aspect: "aspect-[5/4]", sizes: NT_PHOTO_SIZES, depth: 1.0 },
        { col: "col-span-6", aspect: "aspect-[5/4]", sizes: NT_PHOTO_SIZES, depth: 1.1 },
      ];
    case 4:
      return [
        { col: "col-span-6", aspect: "aspect-[5/4]", sizes: NT_PHOTO_SIZES, depth: 1.0 },
        { col: "col-span-6", aspect: "aspect-[5/4]", sizes: NT_PHOTO_SIZES, depth: 1.2 },
        { col: "col-span-6", aspect: "aspect-[5/4]", sizes: NT_PHOTO_SIZES, depth: 0.9 },
        { col: "col-span-6", aspect: "aspect-[5/4]", sizes: NT_PHOTO_SIZES, depth: 1.1 },
      ];
    default:
      return getGalleryLayout(count);
  }
}

function NationalTeamImages({ photos, playerName }: { photos: Photo[]; playerName: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const galleryPhotos: GalleryPhoto[] = photos.map((p) => ({
    id: p.id,
    url: p.url,
    title: p.title,
    altText: p.altText,
  }));
  const layout = ntPhotoLayout(galleryPhotos.length);

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
// Contador (CountUp) usado al pie de la columna del timeline.
// ----------------------------------------------------------------------------

function Stat({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent: "primary" | "accent" | "neutral";
}) {
  const color =
    accent === "primary" ? "var(--theme-primary)" : accent === "accent" ? "var(--theme-accent)" : "#ffffff";
  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 backdrop-blur-xl">
      <CountUp value={value} className="font-heading text-2xl font-black leading-none md:text-3xl" style={{ color }} />
      <span className="mt-1 font-body text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
        {label}
      </span>
    </div>
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
          acc.assists += s.assists ?? 0;
          return acc;
        },
        { caps: 0, goals: 0, assists: 0 },
      ),
    [stints],
  );

  // Convocatoria "máxima" alcanzada: la etapa con la categoría más alta
  // (desempate por año más reciente). El nombre y la bandera del header se
  // derivan de ESA etapa para no atribuir la categoría a otra selección (caso
  // doble nacionalidad: Argentina Sub-20 + Italia Mayor ≠ "Argentina (Mayor)").
  const peakStint = useMemo(() => {
    if (stints.length === 0) return null;
    let best = stints[0];
    for (const s of stints) {
      const diff = NT_CATEGORY_RANK[s.ageCategory] - NT_CATEGORY_RANK[best.ageCategory];
      if (diff > 0 || (diff === 0 && (s.startYear ?? 0) > (best.startYear ?? 0))) best = s;
    }
    return best;
  }, [stints]);

  // Banderas distintas (puede tener doble nacionalidad), liderando con la de la
  // etapa máxima para que la bandera principal coincida con el nombre mostrado.
  const distinctCountries = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of peakStint ? [peakStint, ...stints] : stints) {
      const c = s.countryCode;
      if (c && !seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
    return out;
  }, [stints, peakStint]);

  const primaryName = peakStint?.teamName ?? stints[0]?.teamName ?? labels.title;
  const topCategory = peakStint ? labels.ageCategory[peakStint.ageCategory] : null;

  const useAnimated = isDesktop && sorted.length >= ANIMATE_THRESHOLD;

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
          <h2 className="font-heading text-4xl font-black uppercase leading-[0.9] text-white drop-shadow-2xl md:text-5xl lg:text-6xl">
            {labels.title}
          </h2>
          <div className="mt-3 flex items-center gap-2">
            {distinctCountries.slice(0, 3).map((code) => (
              <CountryFlag key={code} code={code} size={24} />
            ))}
            <span className="font-body text-sm font-semibold uppercase tracking-wider text-white/65">
              {primaryName}
              {topCategory ? <span className="text-white/45"> ({topCategory})</span> : null}
            </span>
          </div>
        </header>

        {/* Dos columnas */}
        <div className="grid min-h-0 gap-7 lg:grid-cols-[1.12fr_1fr] lg:gap-12">
          {/* Timeline + contadores */}
          <div className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1">
              {useAnimated ? (
                <AnimatedTimeline stints={sorted} labels={labels} />
              ) : (
                <StaticTimeline stints={sorted} labels={labels} />
              )}
            </div>

            {/* Contadores al pie del timeline */}
            <div className="mt-6 flex flex-wrap items-stretch gap-2.5">
              <Stat value={sorted.length} label={labels.callups} accent="primary" />
              {totals.caps > 0 ? <Stat value={totals.caps} label={labels.stats.caps} accent="neutral" /> : null}
              {totals.goals > 0 ? <Stat value={totals.goals} label={labels.stats.goals} accent="accent" /> : null}
              {totals.assists > 0 ? (
                <Stat value={totals.assists} label={labels.stats.assists} accent="primary" />
              ) : null}
            </div>
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
