"use client";

import { motion } from "framer-motion";
import {
  Award,
  ExternalLink,
  Calendar,
  MapPin,
  Users,
  Globe2,
  ShieldCheck,
} from "lucide-react";
import CountUp from "@/components/ui/CountUp";
import GlassCard from "@/components/ui/GlassCard";
import ModuleBackdrop from "../ModuleBackdrop";
import type { AgencyPublicData } from "../AgencyLayoutResolver";

type Props = {
  agency: AgencyPublicData["agency"];
  playersCount: number;
  staffLicenses: AgencyPublicData["staffLicenses"];
  sections: AgencyPublicData["sections"];
};

function isVisible(sections: AgencyPublicData["sections"], id: string) {
  const s = sections.find((s) => s.section === id);
  return s ? s.visible : true;
}

type Stat = { icon: typeof Users; label: string; value: number; pad?: number };

export default function AgencyAboutModule({ agency, playersCount, staffLicenses, sections }: Props) {
  if (!isVisible(sections, "about")) return null;

  const totalLicenses = staffLicenses.reduce((sum, s) => sum + s.licenses.length, 0);

  const stats: Stat[] = [
    { icon: Users, label: "Jugadores", value: playersCount, pad: 2 },
    { icon: Globe2, label: "Países", value: agency.operativeCountries?.length ?? 0, pad: 2 },
    { icon: ShieldCheck, label: "Licencias", value: totalLicenses, pad: 2 },
  ];

  if (agency.foundationYear) {
    stats.unshift({ icon: Calendar, label: "Fundada", value: agency.foundationYear, pad: 0 });
  }

  const hasAnything =
    agency.description ||
    totalLicenses > 0 ||
    agency.headquarters ||
    agency.foundationYear ||
    agency.verifiedLink;

  if (!hasAnything) return null;

  return (
    <section id="about" className="relative scroll-mt-32 grid gap-16 lg:grid-cols-12 isolate">
      <ModuleBackdrop variant="twin" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15%" }}
        transition={{ duration: 0.7 }}
        className="lg:col-span-5 space-y-7"
      >
        <div
          className="text-[10px] uppercase tracking-[0.4em] font-bold"
          style={{ color: "var(--theme-accent)" }}
        >
          / Sobre la agencia
        </div>
        <h2 className="font-heading text-5xl md:text-7xl font-black uppercase leading-[0.9] tracking-tighter text-white">
          {agency.name}
        </h2>

        {agency.tagline && (
          <p
            className="text-base md:text-lg uppercase tracking-[0.3em] font-medium"
            style={{ color: "var(--theme-accent)" }}
          >
            {agency.tagline}
          </p>
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70 pt-1">
          {agency.headquarters && (
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-white/40" />
              {agency.headquarters}
            </span>
          )}
          {agency.foundationYear && (
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4 text-white/40" />
              Desde {agency.foundationYear}
            </span>
          )}
        </div>

        {agency.verifiedLink && (
          <a
            href={agency.verifiedLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide hover:opacity-80 transition-opacity"
            style={{ color: "var(--theme-accent)" }}
          >
            <ExternalLink className="h-4 w-4" />
            Validación oficial
          </a>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15%" }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="lg:col-span-7 space-y-10"
      >
        {agency.description && (
          <p className="text-lg md:text-xl leading-relaxed text-white/85 whitespace-pre-wrap font-light first-letter:font-heading first-letter:font-black first-letter:text-5xl first-letter:mr-2 first-letter:float-left first-letter:leading-[0.9]">
            {agency.description}
          </p>
        )}

        {stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <GlassCard key={s.label} variant="neutral" radius={16} className="p-5">
                  <div className="relative space-y-2">
                    <div
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
                        color: "var(--theme-accent)",
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <CountUp
                      value={s.value}
                      padStart={s.pad ?? 0}
                      className="block font-heading text-3xl md:text-4xl font-black text-white leading-none"
                    />
                    <div className="text-[10px] uppercase tracking-[0.24em] text-white/45 font-semibold">
                      {s.label}
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {totalLicenses > 0 && (
          <div className="space-y-4">
            <h4 className="text-[10px] font-semibold text-white/45 uppercase tracking-[0.3em]">
              Licencias del equipo
            </h4>
            <div className="space-y-3">
              {staffLicenses.map((s) => (
                <div key={s.managerId} className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    {s.managerName} ·
                  </span>
                  {s.licenses.map((lic, idx) => (
                    <div
                      key={`${s.managerId}-${idx}`}
                      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/85"
                      style={{
                        border: "1px solid rgba(255,255,255,0.10)",
                        backgroundColor: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <Award className="h-4 w-4" style={{ color: "var(--theme-accent)" }} />
                      <span>{lic.type}</span>
                      <span className="text-white/30 px-1">·</span>
                      <span className="text-white/60">{lic.number}</span>
                      {lic.url && (
                        <a
                          href={lic.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 hover:text-white"
                          style={{ color: "var(--theme-accent)" }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </section>
  );
}
