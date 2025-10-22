'use client';

import Link from "next/link";
import { Button, Card, CardBody, Chip, Divider } from "@heroui/react";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";

const STAT_ITEMS = [
  {
    label: "Perfiles validados",
    value: "+1.2K",
    description: "Jugadores con identidad y trayectoria confirmada.",
  },
  {
    label: "Clubes activos",
    value: "86",
    description: "Equipos que buscan talento en nuestra red.",
  },
  {
    label: "Referencias",
    value: "4.8/5",
    description: "Promedio de reseñas verificadas por cuerpo técnico.",
  },
];

export default function HeroSection() {
  return (
    <section className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-8">
        <Chip color="success" variant="flat" className="w-fit uppercase tracking-wide">
          Beta abierta
        </Chip>
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
            El hub donde el talento futbolístico gana visibilidad real.
          </h1>
          <p className="text-lg text-neutral-300">
            Centralizá tu perfil profesional, sumá reseñas verificadas y conectá con clubes que
            buscan potenciar su plantel. Todo en un solo lugar y con verificación humana.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            as={Link}
            href="/onboarding/start"
            color="success"
            size="lg"
            endContent={<ArrowRight className="h-4 w-4" />}
            className="font-semibold"
          >
            Crear mi perfil
          </Button>
          <Button
            as={Link}
            href="/auth/sign-in"
            variant="bordered"
            size="lg"
            className="border-white/20 text-white"
            endContent={<ShieldCheck className="h-4 w-4" />}
          >
            Cómo validamos
          </Button>
        </div>
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur">
          <div className="flex items-center gap-3 text-sm uppercase tracking-wide text-neutral-400">
            <Users className="h-4 w-4" />
            <span>Lo que dicen los clubes</span>
          </div>
          <p className="text-neutral-200">
            “En BallersHub encontramos perfiles con historial comprobado y referencias confiables. Nos ahorra
            semanas de scouting.”
          </p>
          <span className="text-sm text-neutral-500">Club Atlético Aurora · Dirección Deportiva</span>
        </div>
      </div>

      <Card className="border-white/10 bg-black/30 backdrop-blur">
        <CardBody className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold text-white">Tu trayectoria, sintetizada</h2>
            <p className="text-sm text-neutral-400">
              Subí certificados, videos destacados y referencias para fortalecer tu perfil profesional.
            </p>
          </div>
          <Divider className="bg-white/10" />
          <div className="grid gap-6">
            {STAT_ITEMS.map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-neutral-400">{item.label}</p>
                <p className="text-3xl font-semibold text-white">{item.value}</p>
                <p className="text-sm text-neutral-400">{item.description}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
