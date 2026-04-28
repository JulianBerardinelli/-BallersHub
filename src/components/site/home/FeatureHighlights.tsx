import { CalendarCheck, Sparkles, Trophy } from "lucide-react";

const FEATURES = [
  {
    title: "Verificación profesional",
    description:
      "Nuestro equipo valida identidad, contratos y antecedentes para generar confianza en cada perfil.",
    icon: Trophy,
    tag: "Confianza",
    accent: "lime" as const,
  },
  {
    title: "Agenda deportiva integrada",
    description:
      "Cargá tus próximos partidos y presentaciones. Compartí agenda con clubes y representantes en tiempo real.",
    icon: CalendarCheck,
    tag: "Visibilidad",
    accent: "blue" as const,
  },
  {
    title: "Presentaciones listas en minutos",
    description:
      "Plantillas inteligentes para enviar tu perfil a clubes con métricas, clips destacados y reseñas.",
    icon: Sparkles,
    tag: "Escalá tu marca",
    accent: "lime" as const,
  },
];

export default function FeatureHighlights() {
  return (
    <section className="space-y-10">
      <header className="max-w-2xl space-y-3">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
          Pensado para profesionales
        </span>
        <h2 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          Construí un perfil listo para compartir
        </h2>
        <p className="text-sm leading-[1.6] text-bh-fg-3">
          Herramientas diseñadas para jugadoras, jugadores y staff técnico que
          quieren profesionalizar su presencia digital.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {FEATURES.map(({ title, description, icon: Icon, tag, accent }) => (
          <FeatureCard
            key={title}
            title={title}
            description={description}
            Icon={Icon}
            tag={tag}
            accent={accent}
          />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({
  title,
  description,
  Icon,
  tag,
  accent,
}: {
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  tag: string;
  accent: "lime" | "blue";
}) {
  const iconWrap =
    accent === "lime"
      ? "bg-[rgba(204,255,0,0.08)] text-bh-lime border-[rgba(204,255,0,0.22)]"
      : "bg-[rgba(0,194,255,0.08)] text-bh-blue border-[rgba(0,194,255,0.22)]";
  const tagClass =
    accent === "lime"
      ? "bg-[rgba(204,255,0,0.1)] text-bh-lime border-[rgba(204,255,0,0.22)]"
      : "bg-[rgba(0,194,255,0.1)] text-bh-blue border-[rgba(0,194,255,0.22)]";

  return (
    <article className="bh-card-lift flex h-full flex-col gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-bh-md border ${iconWrap}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span
          className={`inline-flex items-center rounded-bh-pill border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${tagClass}`}
        >
          {tag}
        </span>
      </div>
      <h3 className="font-bh-heading text-lg font-bold leading-[1.2] text-bh-fg-1">
        {title}
      </h3>
      <p className="text-sm leading-[1.6] text-bh-fg-3">{description}</p>
    </article>
  );
}
