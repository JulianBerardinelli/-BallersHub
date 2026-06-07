"use client";

import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import ModuleBackdrop from "../ModuleBackdrop";
import { resolveServiceIcon } from "@/lib/agency/service-icons";
import type { AgencyPublicData } from "../AgencyLayoutResolver";

type ServiceItem = NonNullable<AgencyPublicData["agency"]["services"]>[number];

type Props = {
  services: ServiceItem[] | null;
  sections: AgencyPublicData["sections"];
};

export default function AgencyServicesModule({ services, sections }: Props) {
  const visible = sections.find((s) => s.section === "services");
  if (visible && !visible.visible) return null;
  if (!services || services.length === 0) return null;

  return (
    <section id="services" className="relative scroll-mt-32 space-y-10 isolate">
      <ModuleBackdrop variant="pulse" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15%" }}
        transition={{ duration: 0.6 }}
        className="space-y-3 max-w-3xl"
      >
        <div
          className="text-[10px] uppercase tracking-[0.4em] font-bold"
          style={{ color: "var(--theme-accent)" }}
        >
          / Servicios
        </div>
        <h2 className="font-heading text-5xl md:text-7xl font-black uppercase leading-[0.9] tracking-tighter text-white">
          Lo que ofrecemos
        </h2>
        <p className="text-white/60 text-lg font-light">
          Enfoque integral para cada etapa de la carrera de nuestros representados.
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, idx) => {
          const Icon = resolveServiceIcon(service.icon);
          const accent = service.color || "var(--theme-accent)";
          return (
            <motion.div
              key={`${service.title}-${idx}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.5, delay: Math.min(idx * 0.05, 0.4) }}
              className="h-full"
            >
              <GlassCard variant="neutral" radius={18} className="p-6">
                <div className="relative space-y-4">
                  <div
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: service.color
                        ? `color-mix(in srgb, ${service.color} 18%, transparent)`
                        : "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
                      color: accent,
                      border: service.color
                        ? `1px solid color-mix(in srgb, ${service.color} 35%, transparent)`
                        : undefined,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-xl font-bold uppercase tracking-tight text-white leading-tight">
                    {service.title}
                  </h3>
                  {service.description && (
                    <p className="text-sm text-white/65 leading-relaxed line-clamp-4">
                      {service.description}
                    </p>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
