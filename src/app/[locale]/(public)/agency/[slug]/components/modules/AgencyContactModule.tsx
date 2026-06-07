"use client";

import { motion } from "framer-motion";
import { Mail, Phone, Globe, Instagram, Linkedin, Twitter, ArrowUpRight } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import ModuleBackdrop from "../ModuleBackdrop";
import type { AgencyPublicData } from "../AgencyLayoutResolver";

type Props = {
  agency: AgencyPublicData["agency"];
  sections: AgencyPublicData["sections"];
};

export default function AgencyContactModule({ agency, sections }: Props) {
  const visible = sections.find((s) => s.section === "contact");
  if (visible && !visible.visible) return null;
  const channels = [
    agency.contactEmail
      ? {
          kind: "email",
          label: "Email",
          value: agency.contactEmail,
          href: `mailto:${agency.contactEmail}`,
          icon: Mail,
        }
      : null,
    agency.contactPhone
      ? {
          kind: "phone",
          label: "Teléfono",
          value: agency.contactPhone,
          href: `tel:${agency.contactPhone.replace(/[^\d+]/g, "")}`,
          icon: Phone,
        }
      : null,
    agency.websiteUrl
      ? {
          kind: "website",
          label: "Sitio web",
          value: agency.websiteUrl.replace(/^https?:\/\//, ""),
          href: agency.websiteUrl,
          icon: Globe,
        }
      : null,
    agency.instagramUrl
      ? {
          kind: "instagram",
          label: "Instagram",
          value: "@" + (agency.instagramUrl.split("/").filter(Boolean).pop() || "instagram"),
          href: agency.instagramUrl,
          icon: Instagram,
        }
      : null,
    agency.linkedinUrl
      ? {
          kind: "linkedin",
          label: "LinkedIn",
          value: "Perfil oficial",
          href: agency.linkedinUrl,
          icon: Linkedin,
        }
      : null,
    agency.twitterUrl
      ? {
          kind: "twitter",
          label: "Twitter",
          value: "Perfil oficial",
          href: agency.twitterUrl,
          icon: Twitter,
        }
      : null,
  ].filter(Boolean) as Array<{
    kind: string;
    label: string;
    value: string;
    href: string;
    icon: typeof Mail;
  }>;

  if (channels.length === 0) return null;

  return (
    <section id="contact" className="relative scroll-mt-32 isolate">
      <ModuleBackdrop variant="halo" align="center" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15%" }}
        transition={{ duration: 0.6 }}
      >
        <GlassCard variant="dark" radius={28} className="p-8 md:p-14">
        <div
          className="absolute -top-1/2 -right-1/4 h-[600px] w-[600px] rounded-full blur-[160px] opacity-20 pointer-events-none"
          style={{ backgroundColor: "var(--theme-accent)" }}
        />

        <div className="relative grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-5">
            <div
              className="text-[10px] uppercase tracking-[0.4em] font-bold"
              style={{ color: "var(--theme-accent)" }}
            >
              / Contacto
            </div>
            <h2 className="font-heading text-4xl md:text-6xl font-black uppercase leading-[0.95] tracking-tighter text-white">
              Hablemos sobre tu próximo movimiento
            </h2>
            <p className="text-white/60 text-base md:text-lg font-light leading-relaxed">
              Para clubes, jugadores y prensa: respondemos cualquier consulta vinculada a la representación de nuestro roster.
            </p>
          </div>

          <div className="lg:col-span-7 space-y-3">
            {channels.map((c, idx) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={c.kind}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-10%" }}
                  transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.3) }}
                >
                  <GlassCard variant="neutral" radius={14} maxTilt={5}>
                    <a
                      href={c.href}
                      target={c.href.startsWith("http") ? "_blank" : undefined}
                      rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="group relative z-20 flex items-center justify-between gap-4 px-5 py-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
                          style={{
                            backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
                            color: "var(--theme-accent)",
                          }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.18em]">
                            {c.label}
                          </div>
                          <div className="text-sm md:text-base font-medium text-white truncate">
                            {c.value}
                          </div>
                        </div>
                      </div>
                      <ArrowUpRight
                        className="h-4 w-4 text-white/40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                      />
                    </a>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
        </GlassCard>
      </motion.div>
    </section>
  );
}
