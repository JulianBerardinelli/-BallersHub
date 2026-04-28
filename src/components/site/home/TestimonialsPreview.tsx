import { Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "María López",
    role: "Extremo · Primera División Femenina",
    quote:
      "BallersHub me permitió centralizar videos y referencias en minutos. Ahora cada contacto recibe información actualizada.",
  },
  {
    name: "Sebastián Duarte",
    role: "Coordinador de scouting · Club Andino",
    quote:
      "La plataforma nos da transparencia sobre la trayectoria de cada jugadora. Filtramos por posición y estado físico al instante.",
  },
];

export default function TestimonialsPreview() {
  return (
    <section className="space-y-8">
      <header className="flex items-start gap-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-bh-md border border-[rgba(204,255,0,0.22)] bg-[rgba(204,255,0,0.08)] text-bh-lime">
          <Quote className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <h2 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
            Historias reales, impacto tangible
          </h2>
          <p className="text-sm text-bh-fg-3">
            Una comunidad que crece con validación y acompañamiento constante.
          </p>
        </div>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {TESTIMONIALS.map(({ name, role, quote }) => (
          <figure
            key={name}
            className="bh-card-lift flex h-full flex-col justify-between gap-5 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6"
          >
            <blockquote className="text-sm leading-[1.6] text-bh-fg-2">
              &ldquo;{quote}&rdquo;
            </blockquote>
            <figcaption>
              <div className="font-bh-heading text-base font-semibold text-bh-fg-1">
                {name}
              </div>
              <div className="text-xs text-bh-fg-3">{role}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
