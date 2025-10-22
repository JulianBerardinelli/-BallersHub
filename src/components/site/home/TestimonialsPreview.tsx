'use client';

import { Avatar, Card, CardBody } from "@heroui/react";
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
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-white/10 bg-white/5 p-2">
          <Quote className="h-5 w-5 text-success-300" />
        </span>
        <div>
          <h2 className="text-3xl font-semibold text-white">Historias reales, impacto tangible</h2>
          <p className="text-sm text-neutral-400">Una comunidad que crece con validación y acompañamiento constante.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {TESTIMONIALS.map(({ name, role, quote }) => (
          <Card key={name} className="h-full border-white/10 bg-black/40 backdrop-blur">
            <CardBody className="space-y-4">
              <p className="text-neutral-200">“{quote}”</p>
              <div className="flex items-center gap-3">
                <Avatar name={name} className="bg-success-500 text-base font-semibold" />
                <div>
                  <p className="font-medium text-white">{name}</p>
                  <p className="text-xs uppercase tracking-wide text-neutral-400">{role}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
