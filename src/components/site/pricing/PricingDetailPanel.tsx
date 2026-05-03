"use client";

import Link from "next/link";
import { useRef } from "react";
import { m, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight, ChevronRight, Check, Sparkles } from "lucide-react";

import {
  DeviceFrame,
  PlaceholderScreen,
  type DeviceKind,
  type Accent,
} from "./PricingMocks";
import type { Audience, PlanId, PlanTier } from "./data";

export type DetailPanelPlan = {
  id: PlanId;
  audience: Audience;
  tier: PlanTier;
  name: string;
  tagline: string;
  accent: Accent;
  ctaLabel: string;
  ctaHref: string;
};

type Scene = {
  eyebrow: string;
  title: string;
  description: string;
  device: DeviceKind;
  variant: "profile" | "dashboard" | "search";
  caption: string;
};

type Detail = {
  pitch: string;
  benefits: string[];
  scenes: Scene[];
};

const PRICING_DETAIL: Record<PlanId, Detail> = {
  // ----------------- PLAYER -----------------
  "free-player": {
    pitch:
      "Lo necesario para presentarte profesionalmente. URL pública, datos básicos y compartido en un toque — en cualquier dispositivo.",
    benefits: [
      "URL pública personalizable",
      "Datos básicos curados",
      "Hasta 3 redes y 3 noticias",
      "Compartilo por WhatsApp en un toque",
    ],
    scenes: [
      {
        eyebrow: "Vista 01 · Perfil público",
        title: "Tu identidad pública, en una URL",
        description:
          "Datos clave, foto profesional y trayectoria a la vista. La presentación más limpia para clubes que recién te descubren.",
        device: "desktop",
        variant: "profile",
        caption: "ballershub.app/perfil/jose-talleres",
      },
      {
        eyebrow: "Vista 02 · Tablet",
        title: "Cómo se ve en tablet",
        description:
          "El perfil se adapta al formato vertical sin perder jerarquía. Pensado para presentaciones rápidas en reuniones presenciales.",
        device: "tablet",
        variant: "profile",
        caption: "iPad · 1024×1366",
      },
      {
        eyebrow: "Vista 03 · Mobile",
        title: "En el bolsillo de cada scout",
        description:
          "Layout mobile-first para compartir por WhatsApp o redes. Lo importante arriba, todo accesible con una mano.",
        device: "mobile",
        variant: "profile",
        caption: "iPhone · 390×844",
      },
    ],
  },

  "pro-player": {
    pitch:
      "El plan que usa la mayoría: plantilla pro, métricas reales, valores de mercado y soporte humano. Pensado para impulsar tu próxima transferencia.",
    benefits: [
      "Plantilla Pro Portfolio con motions",
      "Multimedia ilimitada y 5 imágenes en galería",
      "Valores de mercado, valoraciones y logros visibles",
      "Reviews con invitación + contactos de referencia",
      "5 solicitudes de corrección/semana por rubro",
      "Soporte humano prioritario · SEO Pro",
    ],
    scenes: [
      {
        eyebrow: "Vista 01 · Dashboard",
        title: "Tus métricas reales, en vivo",
        description:
          "Visitas, contactos y rating actualizados al minuto. Cuatro indicadores de impacto y una vista de actividad reciente.",
        device: "desktop",
        variant: "dashboard",
        caption: "dashboard.ballershub.app/insights",
      },
      {
        eyebrow: "Vista 02 · Agenda",
        title: "Coordiná directamente con clubes",
        description:
          "Tu calendario sincronizado: partidos, entrenamientos y reuniones. Los clubes pueden coordinar visitas en tiempo real.",
        device: "desktop",
        variant: "dashboard",
        caption: "agenda.ballershub.app · Mayo 2026",
      },
      {
        eyebrow: "Vista 03 · Mobile",
        title: "Notificaciones en el bolsillo",
        description:
          "Tu actividad y nuevas oportunidades sincronizadas con tu móvil. Sabés cuándo alguien vuelve a tu perfil.",
        device: "mobile",
        variant: "dashboard",
        caption: "iOS · App nativa próximamente",
      },
    ],
  },

  // ----------------- AGENCY -----------------
  "free-agency": {
    pitch:
      "Presencia esencial para tu agencia. Hasta 2 members, cartera limitada y plantilla default — lo necesario para empezar a operar.",
    benefits: [
      "URL pública personalizable",
      "Hasta 2 members del equipo",
      "Cartera de hasta 5 jugadores",
      "Hasta 3 redes y 3 noticias",
    ],
    scenes: [
      {
        eyebrow: "Vista 01 · Agencia",
        title: "Tu agencia, presentada con identidad",
        description:
          "Información de la agencia, equipo visible y cartera de hasta 5 representados. Plantilla default, lista en minutos.",
        device: "desktop",
        variant: "profile",
        caption: "ballershub.app/agency/norte-srl",
      },
      {
        eyebrow: "Vista 02 · Tablet",
        title: "Trabajo presencial sin fricción",
        description:
          "El perfil de agencia adaptado a tablet: ideal para presentar al staff técnico de un club o llevar a reuniones de cuerpo técnico.",
        device: "tablet",
        variant: "profile",
        caption: "iPad · 1024×1366",
      },
      {
        eyebrow: "Vista 03 · Mobile",
        title: "Tu agencia en el bolsillo",
        description:
          "Para que clubes y jugadores libres encuentren tu información de contacto desde cualquier dispositivo.",
        device: "mobile",
        variant: "profile",
        caption: "iPhone · 390×844",
      },
    ],
  },

  "pro-agency": {
    pitch:
      "El stack completo para tu agencia: cartera ilimitada, equipo sin límites y 5 slots de Pro Player para tus representados — todo con plantilla pro.",
    benefits: [
      "Plantilla Pro Portfolio para agencias",
      "Members ilimitados con roles",
      "Cartera ilimitada de jugadores",
      "5 slots de Pro Player otorgables",
      "Reviews con invitación + contactos de referencia",
      "SEO Pro · soporte humano prioritario",
    ],
    scenes: [
      {
        eyebrow: "Vista 01 · Cartera",
        title: "Cartera ilimitada con búsqueda",
        description:
          "Filtrá tu cartera por edad, posición o estado contractual. Cada jugador con su perfil pro listo para compartir.",
        device: "desktop",
        variant: "search",
        caption: "agency.ballershub.app/roster",
      },
      {
        eyebrow: "Vista 02 · Equipo",
        title: "Coordiná con tu staff",
        description:
          "Members ilimitados con roles diferenciados (representante principal, asistente, scout). Cada uno con permisos sobre la cartera.",
        device: "desktop",
        variant: "dashboard",
        caption: "agency.ballershub.app/team",
      },
      {
        eyebrow: "Vista 03 · Mobile",
        title: "Tu agencia, móvil-first",
        description:
          "Toda la cartera y notificaciones de actividad disponibles desde cualquier dispositivo del equipo.",
        device: "mobile",
        variant: "dashboard",
        caption: "iOS · App nativa próximamente",
      },
    ],
  },
};

// 2 cards in md:grid-cols-2 inside max-w-1200 with gap-6.
// Card centers sit ~300px off-centre from the container midline.
function cardOriginX(idx: number): string {
  const offset = idx === 0 ? -300 : 300;
  return offset < 0
    ? `calc(50% - ${-offset}px)`
    : `calc(50% + ${offset}px)`;
}

const CONTAINER_EASE = [0.22, 1, 0.36, 1] as const;

export default function PricingDetailPanel({
  plan,
  activeIdx,
}: {
  plan: DetailPanelPlan;
  activeIdx: number;
}) {
  const detail = PRICING_DETAIL[plan.id];
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const accentSeam =
    plan.accent === "blue"
      ? "rgba(0, 194, 255, 0.55)"
      : plan.accent === "lime"
        ? "rgba(204, 255, 0, 0.6)"
        : "rgba(255, 255, 255, 0.35)";

  return (
    <m.div
      key={plan.id}
      initial={{ opacity: 0, scaleY: 0.94, y: -6 }}
      animate={{ opacity: 1, scaleY: 1, y: 0 }}
      exit={{ opacity: 0, scaleY: 0.94, y: -6 }}
      transition={{
        scaleY: { duration: 0.55, ease: CONTAINER_EASE },
        y: { duration: 0.55, ease: CONTAINER_EASE },
        opacity: { duration: 0.32, ease: "easeOut" },
      }}
      style={{
        transformOrigin: `${cardOriginX(activeIdx)} top`,
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        width: "100vw",
      }}
      id={`plan-detail-${plan.id}`}
      className="relative mt-16"
    >
      <div className="bh-tex-mesh bh-noise relative border-y border-white/[0.08]">
        {/* Top accent strip — full-bleed, brightest at the active card column */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accentSeam} 50%, transparent 100%)`,
          }}
        />

        <div className="relative mx-auto max-w-[1440px] px-6 pb-24 pt-14 md:px-10 md:pt-20">
          <PanelHeader plan={plan} pitch={detail.pitch} />

          <ScrolljackSection
            ref={sectionRef}
            scrollYProgress={scrollYProgress}
            scenes={detail.scenes}
            accent={plan.accent}
          />

          <PanelFooter plan={plan} benefits={detail.benefits} />
        </div>
      </div>
    </m.div>
  );
}

// ----------------- Panel header -----------------

function PanelHeader({
  plan,
  pitch,
}: {
  plan: DetailPanelPlan;
  pitch: string;
}) {
  const accentText =
    plan.accent === "blue"
      ? "text-bh-blue"
      : plan.accent === "lime"
        ? "text-bh-lime"
        : "text-bh-fg-1";
  const accentDot =
    plan.accent === "blue"
      ? "bg-bh-blue"
      : plan.accent === "lime"
        ? "bg-bh-lime"
        : "bg-white/40";

  const audienceLabel = plan.audience === "agency" ? "Agencia" : "Jugador";

  return (
    <m.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.18,
        ease: CONTAINER_EASE,
      }}
      className="mx-auto max-w-3xl text-center"
    >
      <span className="inline-flex items-center gap-2 rounded-bh-pill border border-bh-fg-4 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3 backdrop-blur-md">
        <span className={`h-1.5 w-1.5 rounded-full ${accentDot}`} />
        {audienceLabel} · {plan.tagline} · qué incluye
      </span>
      <h3
        className={`mt-4 font-bh-display text-4xl font-black uppercase leading-[0.95] md:text-5xl lg:text-6xl ${accentText}`}
      >
        Plan {plan.name}
      </h3>
      <p className="mx-auto mt-4 max-w-xl text-[14px] leading-[1.6] text-bh-fg-2">
        {pitch}
      </p>
      <p className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-bh-fg-4">
        <Sparkles className="h-3 w-3" />
        Hacé scroll para recorrer las vistas
      </p>
    </m.header>
  );
}

// --------------- Scrolljack section ---------------

const ScrolljackSection = ({
  ref,
  scrollYProgress,
  scenes,
  accent,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  scrollYProgress: MotionValue<number>;
  scenes: Scene[];
  accent: Accent;
}) => {
  const total = scenes.length;
  const outerHeight = `${total * 120}vh`;

  return (
    <section
      ref={ref}
      className="relative mt-12"
      style={{ minHeight: outerHeight }}
    >
      <div className="sticky top-24 flex h-[calc(100vh-7rem)] items-center">
        <div className="relative h-full w-full">
          <ScrollProgressRail
            scrollYProgress={scrollYProgress}
            total={total}
          />

          {scenes.map((scene, i) => (
            <SceneSlide
              key={i}
              index={i}
              total={total}
              scrollYProgress={scrollYProgress}
              scene={scene}
              accent={accent}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

function SceneSlide({
  index,
  total,
  scrollYProgress,
  scene,
  accent,
}: {
  index: number;
  total: number;
  scrollYProgress: MotionValue<number>;
  scene: Scene;
  accent: Accent;
}) {
  const slot = 1 / total;
  const fadeWidth = 0.12;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const fadeInStart = isFirst ? -1 : index * slot - fadeWidth / 2;
  const fadeInEnd = isFirst ? -0.5 : index * slot + fadeWidth / 2;
  const fadeOutStart = isLast ? 1.5 : (index + 1) * slot - fadeWidth / 2;
  const fadeOutEnd = isLast ? 2 : (index + 1) * slot + fadeWidth / 2;

  const range: number[] = [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd];

  const opacity = useTransform(scrollYProgress, range, [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, range, [56, 0, 0, -48]);
  const scale = useTransform(scrollYProgress, range, [0.94, 1, 1, 0.965]);
  const captionX = useTransform(scrollYProgress, range, [-32, 0, 0, -28]);
  const mockX = useTransform(scrollYProgress, range, [56, 0, 0, -20]);

  const accentText =
    accent === "blue"
      ? "text-bh-blue"
      : accent === "lime"
        ? "text-bh-lime"
        : "text-bh-fg-1";
  const accentBorder =
    accent === "blue"
      ? "border-[rgba(0,194,255,0.22)] bg-[rgba(0,194,255,0.08)] text-bh-blue"
      : accent === "lime"
        ? "border-[rgba(204,255,0,0.22)] bg-[rgba(204,255,0,0.08)] text-bh-lime"
        : "border-white/[0.10] bg-white/[0.04] text-bh-fg-2";

  return (
    <m.div
      style={{ opacity, y, scale }}
      className="absolute inset-0 flex items-center"
    >
      <div className="grid h-full w-full grid-cols-12 items-center gap-8">
        <m.div
          style={{ x: captionX }}
          className="col-span-12 self-center lg:col-span-4"
        >
          <span
            className={`inline-flex items-center rounded-bh-pill border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${accentBorder}`}
          >
            {scene.eyebrow}
          </span>
          <h4
            className={`mt-4 font-bh-display text-2xl font-black uppercase leading-[1.05] md:text-3xl lg:text-[2.25rem] ${accentText}`}
          >
            {scene.title}
          </h4>
          <p className="mt-4 text-[14px] leading-[1.65] text-bh-fg-2">
            {scene.description}
          </p>
          <ul className="mt-5 space-y-2 font-bh-mono text-[11px] uppercase tracking-[0.14em] text-bh-fg-4">
            <li className="flex items-center gap-2">
              <span
                className={`inline-block h-px w-6 ${
                  accent === "blue"
                    ? "bg-bh-blue"
                    : accent === "lime"
                      ? "bg-bh-lime"
                      : "bg-bh-fg-3"
                }`}
              />
              {scene.device === "desktop"
                ? "Desktop · 1440×900"
                : scene.device === "tablet"
                  ? "Tablet · 1024×1366"
                  : "Mobile · 390×844"}
            </li>
            <li>Reemplazable por screenshot real</li>
          </ul>
        </m.div>

        <m.div
          style={{ x: mockX }}
          className="col-span-12 lg:col-span-8"
        >
          <DeviceFrame
            kind={scene.device}
            accent={accent}
            caption={scene.caption}
          >
            <PlaceholderScreen
              accent={accent}
              variant={scene.variant}
              device={scene.device}
            />
          </DeviceFrame>
        </m.div>
      </div>
    </m.div>
  );
}

function ScrollProgressRail({
  scrollYProgress,
  total,
}: {
  scrollYProgress: MotionValue<number>;
  total: number;
}) {
  return (
    <div className="pointer-events-none absolute -left-6 top-1/2 z-10 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex">
      {Array.from({ length: total }).map((_, i) => (
        <RailDot key={i} index={i} total={total} progress={scrollYProgress} />
      ))}
    </div>
  );
}

function RailDot({
  index,
  total,
  progress,
}: {
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const slot = 1 / total;
  const fadeWidth = 0.12;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const fadeInStart = isFirst ? -1 : index * slot - fadeWidth / 2;
  const fadeInEnd = isFirst ? -0.5 : index * slot + fadeWidth / 2;
  const fadeOutStart = isLast ? 1.5 : (index + 1) * slot - fadeWidth / 2;
  const fadeOutEnd = isLast ? 2 : (index + 1) * slot + fadeWidth / 2;

  const range: number[] = [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd];
  const opacity = useTransform(progress, range, [0.35, 1, 1, 0.35]);
  const scale = useTransform(progress, range, [1, 1.6, 1.6, 1]);

  return (
    <m.span
      style={{ opacity, scale }}
      className="block h-1.5 w-1.5 rounded-full bg-bh-fg-2"
    />
  );
}

// --------------- Panel footer (benefits + CTAs) ---------------

function PanelFooter({
  plan,
  benefits,
}: {
  plan: DetailPanelPlan;
  benefits: string[];
}) {
  const accentText =
    plan.accent === "blue"
      ? "text-bh-blue"
      : plan.accent === "lime"
        ? "text-bh-lime"
        : "text-bh-fg-2";

  return (
    <m.footer
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.32,
        ease: CONTAINER_EASE,
      }}
      className="mx-auto mt-12 max-w-5xl"
    >
      <div className="rounded-bh-xl border border-white/[0.08] bg-black/30 p-6 backdrop-blur-md md:p-8">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-bh-fg-4">
              También incluye
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {benefits.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2 text-[13px] text-bh-fg-2"
                >
                  <Check
                    className={`mt-1 h-3 w-3 shrink-0 ${accentText}`}
                    strokeWidth={3}
                  />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Link
              href={plan.ctaHref}
              className="inline-flex items-center justify-center gap-2 rounded-bh-md bg-bh-lime px-6 py-3 text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
            >
              {plan.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-bh-md border border-white/[0.12] px-6 py-3 text-[13px] font-semibold text-bh-fg-2 transition-colors duration-150 hover:bg-white/[0.06] hover:text-bh-fg-1"
            >
              Tengo dudas
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </m.footer>
  );
}
