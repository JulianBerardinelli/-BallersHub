// PromoBanner — visitor-facing BallersHub advertising shown to everyone who is
// NOT the profile owner, in the same mid-dossier slots where the owner sees
// their "Activar Pro" LockedBanner.
//
// Where the locked banner nudges the owner to upgrade *their* profile, this
// invites the visitor — an aspiring player, a club, an agency — to create
// *their own*. For visitors the slot is therefore pure top-of-funnel
// advertising rather than a confusing "unlock someone else's profile" prompt.
//
// Three variants form one small campaign that all funnel to profile creation:
//   • player   — the headline invitation ("armá tu perfil")
//   • showcase — what a Pro profile includes + social proof
//   • agency   — the second creator audience (clubs / representatives)
//
// Server component: zero client JS. The owner/visitor switch lives in the tiny
// client <ProSpot> wrapper. Motion is CSS-only (bh-card-lift + brand glows,
// both reduced-motion-safe) so the LCP-sensitive public portfolio never ships
// an animation runtime. Layout mirrors LockedBanner (section padding, two-col
// grid, ~260px visual) so the owner↔visitor swap causes no layout shift.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  Eye,
  Sparkles,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { bhButtonClass } from "@/components/ui/bh-button-class";

export type PromoVariant = "player" | "showcase" | "agency";

// Canonical "create a profile" entry. Server-gated: redirects anonymous
// visitors to sign-in and back, then to the player/agency role chooser. Same
// hook the landing hero and site footer use.
const ONBOARDING_HREF = "/onboarding/start";

export default function PromoBanner({
  variant,
  side,
}: {
  variant: PromoVariant;
  side: "left" | "right";
}) {
  if (variant === "player") {
    return (
      <PromoShell
        side={side}
        accent="lime"
        eyebrowIcon={Sparkles}
        eyebrow="&apos;BallersHub · Beta abierta"
        title={
          <>
            Tu carrera merece un
            <br />
            <span className="italic text-bh-lime">perfil profesional</span>
          </>
        }
        copy="Centralizá tu trayectoria, sumá videos y referencias verificadas, y hacé que los clubes te encuentren. Crear tu perfil es gratis."
        primary={{ label: "Crear mi perfil", href: ONBOARDING_HREF }}
        secondary={{ label: "Ver cómo funciona", href: "/about" }}
        visual={<ProfileMock />}
      />
    );
  }

  if (variant === "showcase") {
    return (
      <PromoShell
        side={side}
        accent="lime"
        eyebrowIcon={Eye}
        eyebrow="Por qué &apos;BallersHub"
        title={
          <>
            Perfiles que ven
            <br />
            <span className="italic text-bh-lime">los clubes</span>
          </>
        }
        copy="Cancha 3D con análisis táctico, reporte de scouting firmado, galería editorial y prensa. Así se ve un perfil Pro — y arranca con el tuyo."
        primary={{ label: "Armá el tuyo", href: ONBOARDING_HREF }}
        secondary={{
          label: "Ver planes",
          href: "/pricing?audience=player&currency=ARS",
        }}
        visual={<ShowcaseMock />}
      />
    );
  }

  // agency
  return (
    <PromoShell
      side={side}
      accent="blue"
      eyebrowIcon={Users}
      eyebrow="¿Representás jugadores?"
      title={
        <>
          Gestioná tu
          <br />
          <span className="italic text-bh-blue">roster</span> completo
        </>
      }
      copy="Si sos agencia o club, creá y administrá los perfiles de tus jugadores, sumá reportes de scouting firmados y compartilos con un solo link."
      primary={{ label: "Crear cuenta de agencia", href: ONBOARDING_HREF }}
      secondary={{
        label: "Planes para agencias",
        href: "/pricing?audience=agency&currency=ARS",
      }}
      visual={<RosterMock />}
    />
  );
}

// ---------------------------------------------------------------
// Shell — shared two-column layout (text + visual), alternating sides.
// ---------------------------------------------------------------

type Cta = { label: string; href: string };

function PromoShell({
  side,
  accent,
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  copy,
  primary,
  secondary,
  visual,
}: {
  side: "left" | "right";
  accent: "lime" | "blue";
  eyebrow: ReactNode;
  eyebrowIcon: LucideIcon;
  title: ReactNode;
  copy: string;
  primary: Cta;
  secondary?: Cta;
  visual: ReactNode;
}) {
  // Reverse the columns by toggling order utilities — matches LockedBanner so
  // the visitor ad and the owner upsell sit on the same side per slot.
  const textOrder = side === "left" ? "md:order-2" : "md:order-1";
  const visualOrder = side === "left" ? "md:order-1" : "md:order-2";

  const accentText = accent === "blue" ? "text-bh-blue" : "text-bh-lime";
  const accentBorder = accent === "blue" ? "border-bh-blue/40" : "border-bh-lime/40";
  const accentBg = accent === "blue" ? "bg-bh-blue/10" : "bg-bh-lime/10";
  const glow =
    accent === "blue" ? "rgba(0,194,255,0.16)" : "rgba(204,255,0,0.16)";

  return (
    <section className="border-t border-white/[0.10] px-5 py-7 md:px-10 md:py-12">
      <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 items-center gap-5 md:grid-cols-2 md:gap-9">
        <div className={`space-y-3.5 ${textOrder}`}>
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border ${accentBorder} ${accentBg} px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-[0.14em] ${accentText}`}
          >
            <EyebrowIcon size={11} /> {eyebrow}
          </div>
          <h3 className="font-bh-display text-[32px] font-black uppercase leading-[0.95] text-bh-fg-1 md:text-5xl">
            {title}
          </h3>
          <p className="max-w-[460px] font-body text-[13px] leading-[1.6] text-bh-fg-2 md:text-sm">
            {copy}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <Link
              href={primary.href}
              className={bhButtonClass({
                variant: accent === "blue" ? "blue" : "lime",
                size: "lg",
              })}
            >
              {primary.label}
              <ArrowRight size={15} />
            </Link>
            {secondary ? (
              <Link
                href={secondary.href}
                className={bhButtonClass({ variant: "outline", size: "lg" })}
              >
                {secondary.label}
              </Link>
            ) : null}
          </div>
        </div>

        <div
          className={`bh-card-lift relative h-[220px] overflow-hidden rounded-xl border border-white/[0.10] bg-bh-surface-1 md:h-[260px] ${visualOrder}`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(80% 70% at 50% 0%, ${glow} 0%, transparent 70%)`,
            }}
          />
          <div className="relative h-full w-full">{visual}</div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// Visual mocks — crisp (not blurred) brand vignettes that show the visitor
// what they could have. Visual-only, no real data.
// ---------------------------------------------------------------

function ProfileMock() {
  return (
    <div className="flex h-full w-full items-center justify-center p-5">
      <div className="w-full max-w-[280px] rounded-xl border border-white/[0.10] bg-bh-black/40 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-bh-surface-2 to-bh-surface-1"
            style={{ boxShadow: "0 0 0 2px #080808, 0 0 0 3px #CCFF00" }}
          />
          <div className="min-w-0 flex-1">
            <div className="h-2.5 w-2/3 rounded-full bg-white/25" />
            <div className="mt-1.5 h-2 w-1/2 rounded-full bg-bh-lime/60" />
          </div>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-bh-lime/15 text-bh-lime">
            <BadgeCheck size={13} />
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded bg-bh-lime px-2 py-0.5 font-bh-display text-[10px] font-extrabold uppercase tracking-[0.06em] text-bh-black">
            DEL
          </span>
          <span className="rounded bg-white/[0.08] px-2 py-0.5 font-bh-mono text-[10px] uppercase tracking-[0.08em] text-bh-fg-3">
            AR · 21
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {["PJ", "G", "A"].map((k) => (
            <div
              key={k}
              className="rounded border border-white/[0.06] bg-white/[0.03] py-1.5 text-center"
            >
              <div className="font-bh-display text-sm font-black leading-none text-bh-fg-1">
                ··
              </div>
              <div className="mt-1 font-body text-[8px] uppercase tracking-[0.12em] text-bh-fg-3">
                {k}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 font-bh-mono text-[9px] uppercase tracking-[0.14em] text-bh-fg-3">
          <span className="h-1.5 w-1.5 rounded-full bg-bh-lime" />
          Perfil público · &apos;BallersHub
        </div>
      </div>
    </div>
  );
}

function ShowcaseMock() {
  const stats: Array<[string, string]> = [
    ["+1.2K", "perfiles"],
    ["86", "clubes"],
    ["4.8★", "referencias"],
  ];
  const features = [
    "Cancha 3D & scouting",
    "Galería editorial",
    "Prensa & notas",
    "Reseñas verificadas",
  ];
  return (
    <div className="h-full w-full p-5">
      <div className="grid h-full grid-rows-[auto_1fr] gap-2.5">
        <div className="grid grid-cols-3 gap-1.5">
          {stats.map(([value, label]) => (
            <div
              key={label}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-center"
            >
              <div className="font-bh-display text-base font-black leading-none text-bh-fg-1">
                {value}
              </div>
              <div className="mt-1 font-body text-[8px] uppercase tracking-[0.1em] text-bh-fg-3">
                {label}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 content-center gap-1.5">
          {features.map((f) => (
            <div
              key={f}
              className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-bh-surface-2/60 px-2.5 py-2"
            >
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-bh-lime/15 text-bh-lime">
                <Check size={11} />
              </span>
              <span className="font-body text-[11px] text-bh-fg-1">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RosterMock() {
  return (
    <div className="h-full w-full p-5">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-bh-blue/15 text-bh-blue">
          <Building2 size={14} />
        </span>
        <div className="h-2.5 w-24 rounded-full bg-white/25" />
        <span className="ml-auto rounded-full bg-bh-blue/15 px-2 py-0.5 font-bh-mono text-[9px] uppercase tracking-[0.1em] text-bh-blue">
          Agencia
        </span>
      </div>
      <div className="grid gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 rounded-md border border-white/[0.06] bg-bh-surface-2/60 px-2.5 py-2"
          >
            <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-bh-surface-2 to-bh-surface-1 ring-1 ring-white/10" />
            <div className="min-w-0 flex-1">
              <div className="h-2 w-2/3 rounded-full bg-white/25" />
              <div className="mt-1 h-1.5 w-1/3 rounded-full bg-white/10" />
            </div>
            <span className="rounded bg-bh-lime/80 px-1.5 py-0.5 font-bh-display text-[8px] font-extrabold uppercase text-bh-black">
              Pro
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
