'use client';

import Link from "next/link";
import { Button, CardBody, Chip, Divider } from "@heroui/react";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";
import { motion } from "framer-motion";

import { AnimatedCard, AnimatedSection, FloatingShapes } from "@/components/site/ui/motion";

const TEXT_VARIANTS = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

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
    <AnimatedSection
      className="relative grid items-start gap-12 overflow-hidden rounded-3xl border border-white/10 bg-black/25 p-10 shadow-[0_0_60px_rgba(13,213,165,0.08)] backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_420px]"
      initialY={48}
    >
      <FloatingShapes className="opacity-90" />

      <motion.div
        className="relative z-10 space-y-8"
        variants={TEXT_VARIANTS}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-18% 0px -18% 0px" }}
      >
        <motion.div variants={ITEM_VARIANTS}>
          <Chip
            color="success"
            variant="flat"
            className="w-fit border border-success-500/30 bg-success-500/10 uppercase tracking-[0.3em] text-xs text-success-200"
          >
            Beta abierta
          </Chip>
        </motion.div>

        <motion.div className="space-y-4" variants={ITEM_VARIANTS}>
          <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-[2.8rem]">
            El Hub donde el Talento Futbolístico gana Visibilidad Real.
          </h1>
          <p className="text-base text-neutral-300 sm:text-lg">
            Centralizá tu perfil profesional, sumá reseñas verificadas y conectá con clubes que buscan potenciar su plantel.
            Todo en un solo lugar con seguimiento humano y transparente.
          </p>
        </motion.div>

        <motion.div className="flex flex-wrap items-center gap-4" variants={ITEM_VARIANTS}>
          <Button
            as={Link}
            href="/onboarding/start"
            color="success"
            size="lg"
            endContent={<ArrowRight className="h-4 w-4" />}
            className="font-semibold shadow-[0_18px_45px_rgba(13,213,165,0.25)]"
          >
            Crear mi perfil
          </Button>
          <Button
            as={Link}
            href="/auth/sign-in"
            variant="bordered"
            size="lg"
            className="border-white/30 text-white backdrop-blur"
            endContent={<ShieldCheck className="h-4 w-4" />}
          >
            Cómo validamos
          </Button>
        </motion.div>

        <motion.div
          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
          variants={ITEM_VARIANTS}
        >
          <div className="flex items-center gap-3 text-sm uppercase tracking-wide text-neutral-400">
            <Users className="h-4 w-4" />
            <span>Lo que dicen los clubes</span>
          </div>
          <p className="text-neutral-200">
            “En BallersHub encontramos perfiles con historial comprobado y referencias confiables. Nos ahorra semanas de
            scouting.”
          </p>
          <span className="text-sm text-neutral-500">Club Atlético Aurora · Dirección Deportiva</span>
        </motion.div>
      </motion.div>

      <AnimatedCard
        className="relative z-10 border-white/15 bg-black/40 backdrop-blur"
        delay={0.2}
        hoverElevation={18}
      >
        <CardBody className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold text-white">Tu trayectoria, sintetizada</h2>
            <p className="text-sm text-neutral-400">
              Subí certificados, videos destacados y referencias para fortalecer tu perfil profesional.
            </p>
          </div>
          <Divider className="bg-white/10" />
          <div className="grid gap-4">
            {STAT_ITEMS.map((item, index) => (
              <motion.div
                key={item.label}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
                variants={ITEM_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
                transition={{ delay: 0.15 * index, duration: 0.5, ease: "easeOut" }}
              >
                <p className="text-sm text-neutral-400">{item.label}</p>
                <p className="text-3xl font-semibold text-white">{item.value}</p>
                <p className="text-sm text-neutral-400">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </CardBody>
      </AnimatedCard>
    </AnimatedSection>
  );
}
