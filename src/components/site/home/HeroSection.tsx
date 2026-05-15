import Link from "next/link";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";

const STATS = [
  {
    value: "+1.2K",
    label: "Perfiles validados",
    description: "Jugadores con identidad y trayectoria confirmada.",
    accent: "lime" as const,
    delay: "bh-animate-d1",
  },
  {
    value: "86",
    label: "Clubes activos",
    description: "Equipos que buscan talento en nuestra red.",
    accent: "blue" as const,
    delay: "bh-animate-d2",
  },
  {
    value: "4.8/5",
    label: "Referencias",
    description: "Promedio de reseñas verificadas por cuerpo técnico.",
    accent: "blue" as const,
    delay: "bh-animate-d3",
  },
];

export default function HeroSection() {
  return (
    <section className="relative pt-6 md:pt-10">
      <div className="grid items-start gap-12 md:grid-cols-[1.05fr_1fr]">
        {/* Left — copy */}
        <div>
          <span className="bh-animate-in inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
            Beta abierta
          </span>

          <h1 className="bh-animate-in bh-animate-d1 mt-5 font-bh-display text-4xl font-black uppercase leading-[0.95] tracking-[-0.01em] text-bh-fg-1 md:text-[3.25rem] lg:text-[3.5rem]">
            El Hub donde el
            <br />
            <span className="text-bh-lime">Talento</span> Futbolístico
            <br />
            gana Visibilidad Real.
          </h1>

          <p className="bh-animate-in bh-animate-d2 mt-5 max-w-[460px] text-[15px] leading-[1.65] text-bh-fg-3">
            Centralizá tu perfil profesional, sumá reseñas verificadas y
            conectate con clubes que buscan potenciar su plantel. Todo en un
            solo lugar con seguimiento humano y transparente.
          </p>

          <div className="bh-animate-in bh-animate-d3 mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/onboarding/start"
              className="inline-flex items-center gap-2 rounded-bh-md bg-bh-lime px-6 py-3 text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
            >
              Crear mi perfil
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center gap-2 rounded-bh-md border border-bh-fg-4 px-6 py-3 text-sm font-semibold text-bh-fg-1 transition-colors duration-150 hover:bg-white/[0.06]"
            >
              Cómo validamos
              <ShieldCheck className="h-4 w-4" />
            </Link>
          </div>

          <figure className="bh-animate-in bh-animate-d4 bh-card-lift mt-9 max-w-[480px] rounded-bh-lg border border-white/[0.09] bg-white/[0.04] p-5 backdrop-blur-md">
            <figcaption className="mb-2.5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
              <Users className="h-3 w-3" />
              Lo que dicen los clubes
            </figcaption>
            <blockquote className="text-[13px] italic leading-[1.6] text-bh-fg-2">
              &ldquo;En &apos;BallersHub encontramos perfiles con historial
              comprobado y referencias confiables. Nos ahorra semanas de
              scouting.&rdquo;
            </blockquote>
            <p className="mt-2 text-[11px] text-bh-fg-3">
              Club Atlético Aurora · Dirección Deportiva
            </p>
          </figure>
        </div>

        {/* Right — stats */}
        <aside>
          <h2 className="bh-animate-in bh-animate-d1 font-bh-display text-[1.4rem] font-bold uppercase leading-none text-bh-fg-1">
            Tu trayectoria, sintetizada
          </h2>
          <p className="bh-animate-in bh-animate-d2 mt-1.5 text-xs leading-[1.5] text-bh-fg-3">
            Subí certificados, videos y referencias para fortalecer tu perfil.
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            {STATS.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function StatCard({
  value,
  label,
  description,
  accent,
  delay,
}: {
  value: string;
  label: string;
  description: string;
  accent: "lime" | "blue";
  delay: string;
}) {
  const accentClass =
    accent === "lime"
      ? "border-[rgba(204,255,0,0.14)] bg-[rgba(204,255,0,0.05)] shadow-[0_0_20px_rgba(204,255,0,0.06)]"
      : "border-[rgba(0,194,255,0.14)] bg-[rgba(0,194,255,0.05)] shadow-[0_0_20px_rgba(0,194,255,0.06)]";
  const numberClass = accent === "lime" ? "text-bh-lime" : "text-bh-blue";

  return (
    <article
      className={`bh-animate-in ${delay} bh-card-lift rounded-bh-lg border px-6 py-5 backdrop-blur-md ${accentClass}`}
    >
      <div className={`font-bh-display text-[2.5rem] font-black leading-none ${numberClass}`}>
        {value}
      </div>
      <div className="mt-1 text-xs font-medium text-bh-fg-2">{label}</div>
      <div className="mt-0.5 text-[11px] text-bh-fg-3">{description}</div>
    </article>
  );
}
