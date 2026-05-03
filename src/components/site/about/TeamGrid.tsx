// src/components/site/about/TeamGrid.tsx
// Grid del equipo con slot para foto real (Image fill) y fallback con iniciales.
// Cada card tiene textura sutil + accent + hover lift.

import Image from "next/image";

import { ACCENT_STYLES, TEAM, type TeamMember } from "./data";

export default function TeamGrid() {
  return (
    <section className="space-y-10">
      {/* Header con slogan shimmer (Hero display — shimmer del DS) */}
      <header className="flex max-w-2xl flex-col items-start gap-4">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
          El equipo
        </span>
        <h2 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          Personas reales detrás de{" "}
          <span className="text-bh-lime">cada validación</span>
        </h2>
        <p className="bh-shimmer-text font-bh-display text-2xl font-black uppercase italic leading-none tracking-[-0.01em] md:text-3xl">
          &ldquo;De Jugadores, para Jugadores.&rdquo;
        </p>
        <p className="text-sm leading-[1.65] text-bh-fg-3 md:text-[15px]">
          No somos un equipo de oficina mirando el fútbol desde afuera. Somos
          jugadores en actividad, ex-jugadores y analistas que entendemos lo que
          necesita un futbolista para venderse — porque lo vivimos en carne
          propia.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TEAM.map((member) => (
          <TeamCard key={member.name} member={member} />
        ))}
      </div>
    </section>
  );
}

function TeamCard({ member }: { member: TeamMember }) {
  const a = ACCENT_STYLES[member.accent];

  return (
    <article className="bh-card-lift group flex h-full flex-col overflow-hidden rounded-bh-lg border border-white/[0.08] bg-bh-surface-1">
      {/* Foto / avatar slot */}
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        {member.imageSrc ? (
          <Image
            src={member.imageSrc}
            alt={member.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.25,0,0,1)] group-hover:scale-[1.04]"
          />
        ) : (
          <AvatarFallback initials={member.initials} accent={member.accent} />
        )}
        {/* Overlay legibilidad */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bh-black/85 via-bh-black/10 to-transparent"
        />
        {/* Tag de rol */}
        <span
          className={`absolute left-3 top-3 inline-flex items-center rounded-bh-pill border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${a.tagBg} ${a.tagText} ${a.tagBorder} backdrop-blur-md`}
        >
          {member.role.split("·")[0].trim()}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-bh-heading text-base font-bold leading-[1.2] text-bh-fg-1">
          {member.name}
        </h3>
        <span className="text-[11px] uppercase tracking-[0.12em] text-bh-fg-3">
          {member.role}
        </span>
        <p className="mt-2 text-[13px] leading-[1.6] text-bh-fg-3">
          {member.bio}
        </p>
      </div>
    </article>
  );
}

function AvatarFallback({
  initials,
  accent,
}: {
  initials: string;
  accent: TeamMember["accent"];
}) {
  const a = ACCENT_STYLES[accent];
  return (
    <div className="absolute inset-0">
      {/* Textura corporativa */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage: "url(/images/pack/textures/wall_2.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Glow accent */}
      <div
        aria-hidden
        className={`absolute inset-0 ${a.cardBg}`}
        style={{
          background:
            accent === "lime"
              ? "radial-gradient(ellipse 80% 70% at 50% 30%, rgba(204,255,0,0.18) 0%, transparent 70%), linear-gradient(160deg, rgba(255,255,255,0.04), rgba(0,0,0,0.5))"
              : "radial-gradient(ellipse 80% 70% at 50% 30%, rgba(0,194,255,0.18) 0%, transparent 70%), linear-gradient(160deg, rgba(255,255,255,0.04), rgba(0,0,0,0.5))",
        }}
      />
      {/* Iniciales */}
      <div className="relative flex h-full items-center justify-center">
        <span
          className={`font-bh-display text-6xl font-black uppercase ${a.text}`}
        >
          {initials}
        </span>
      </div>
    </div>
  );
}
