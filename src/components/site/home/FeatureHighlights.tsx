import { Card, CardBody, CardHeader, Chip } from "@heroui/react";
import { CalendarCheck, Sparkles, Trophy } from "lucide-react";

const FEATURES = [
  {
    title: "Verificación profesional",
    description:
      "Nuestro equipo valida identidad, contratos y antecedentes para generar confianza en cada perfil.",
    icon: Trophy,
    tag: "Confianza",
  },
  {
    title: "Agenda deportiva integrada",
    description:
      "Cargá tus próximos partidos y presentaciones. Compartí agenda con clubes y representantes en tiempo real.",
    icon: CalendarCheck,
    tag: "Visibilidad",
  },
  {
    title: "Presentaciones listas en minutos",
    description:
      "Plantillas inteligentes para enviar tu perfil a clubes con métricas, clips destacados y reseñas.",
    icon: Sparkles,
    tag: "Escalá tu marca",
  },
];

export default function FeatureHighlights() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Chip variant="bordered" color="success" className="w-fit border-success-500/40 text-success-400">
          Pensado para profesionales
        </Chip>
        <h2 className="text-3xl font-semibold text-white">Construí un perfil listo para compartir</h2>
        <p className="text-neutral-400">
          Herramientas diseñadas para jugadoras, jugadores y staff técnico que quieren profesionalizar su presencia digital.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {FEATURES.map(({ title, description, icon: Icon, tag }) => (
          <Card key={title} className="h-full border-white/10 bg-black/40 backdrop-blur">
            <CardHeader className="flex flex-col items-start gap-3">
              <span className="rounded-full border border-white/10 bg-white/5 p-2">
                <Icon className="h-5 w-5 text-success-400" />
              </span>
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-white">{title}</h3>
                <Chip size="sm" variant="flat" color="success">
                  {tag}
                </Chip>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-sm leading-6 text-neutral-300">{description}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
