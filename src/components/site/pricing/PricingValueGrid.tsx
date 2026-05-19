import { LineChart, ShieldCheck, Users, Zap } from "lucide-react";
import { Reveal, RevealItem, RevealStagger } from "./Reveal";

const ITEMS = [
  {
    title: "Validación humana",
    description:
      "Cada perfil pasa por un control de identidad y trayectoria por nuestro equipo.",
    Icon: ShieldCheck,
    accent: "lime" as const,
  },
  {
    title: "Métricas accionables",
    description:
      "Visitas, contactos y reseñas medidas en tiempo real para entender tu impacto.",
    Icon: LineChart,
    accent: "blue" as const,
  },
  {
    title: "Comunidad activa",
    description:
      "Clubes, agentes y staff técnico que ya usan 'BallersHub para descubrir talento.",
    Icon: Users,
    accent: "lime" as const,
  },
  {
    title: "Setup inmediato",
    description:
      "Plantillas listas y carga guiada: tu primer perfil queda armado en minutos.",
    Icon: Zap,
    accent: "blue" as const,
  },
];

export default function PricingValueGrid() {
  return (
    <section className="relative">
      <Reveal className="mx-auto mb-10 max-w-2xl text-center">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3 backdrop-blur-md">
          Incluido en todos los planes
        </span>
        <h2 className="mt-4 font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-[2.5rem]">
          Todo lo que necesitás para profesionalizar tu juego
        </h2>
      </Reveal>

      <RevealStagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ITEMS.map(({ title, description, Icon, accent }) => (
          <RevealItem key={title}>
            <article className="bh-card-lift bh-noise relative flex h-full flex-col gap-3 overflow-hidden rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
              <div
                aria-hidden
                className="bh-grid-faint pointer-events-none absolute inset-0 opacity-60"
                style={{
                  maskImage:
                    "radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, transparent 80%)",
                  WebkitMaskImage:
                    "radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, transparent 80%)",
                }}
              />
              <span
                className={`relative inline-flex h-9 w-9 items-center justify-center rounded-bh-md border ${
                  accent === "lime"
                    ? "border-[rgba(204,255,0,0.22)] bg-[rgba(204,255,0,0.08)] text-bh-lime"
                    : "border-[rgba(0,194,255,0.22)] bg-[rgba(0,194,255,0.08)] text-bh-blue"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <h3 className="relative font-bh-heading text-base font-bold leading-tight text-bh-fg-1">
                {title}
              </h3>
              <p className="relative text-[13px] leading-[1.55] text-bh-fg-3">
                {description}
              </p>
            </article>
          </RevealItem>
        ))}
      </RevealStagger>
    </section>
  );
}
