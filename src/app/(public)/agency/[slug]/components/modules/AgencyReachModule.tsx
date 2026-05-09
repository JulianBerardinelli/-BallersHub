"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe2, ExternalLink, Users, Building2 } from "lucide-react";
import CountryFlag from "@/components/common/CountryFlag";
import CountUp from "@/components/ui/CountUp";
import GlassCard from "@/components/ui/GlassCard";
import ModuleBackdrop from "../ModuleBackdrop";
import Globe3D from "./reach/Globe3D";
import type { AgencyPublicData } from "../AgencyLayoutResolver";

type Props = {
  countries: string[] | null;
  countryProfiles: AgencyPublicData["countryProfiles"];
  teamRelations: AgencyPublicData["teamRelations"];
  players: AgencyPublicData["players"];
  sections: AgencyPublicData["sections"];
};

export default function AgencyReachModule({
  countries,
  countryProfiles,
  teamRelations,
  players,
  sections,
}: Props) {
  const visible = sections.find((s) => s.section === "reach");
  // Always keep one country active so the detail panel never collapses and
  // the globe doesn't jump back to a "neutral" rotation when the cursor
  // leaves a pin/list item. We default to the first operative country and
  // only swap it for another (never null) on user interaction.
  const [active, setActive] = useState<string | null>(
    countries && countries.length > 0 ? countries[0] : null,
  );

  const dnEs = new Intl.DisplayNames(["es"], { type: "region", fallback: "code" });

  // Aggregate per-country counts (memoized so they don't recompute every hover)
  const countsByCountry = useMemo(() => {
    const map = new Map<string, { teams: number; players: number }>();
    if (countries) {
      for (const cc of countries) {
        map.set(cc, { teams: 0, players: 0 });
      }
    }
    for (const rel of teamRelations) {
      const cc = rel.countryCode?.toUpperCase();
      if (!cc) continue;
      const entry = map.get(cc) ?? { teams: 0, players: 0 };
      entry.teams += 1;
      map.set(cc, entry);
    }
    for (const p of players) {
      const cc = p.currentTeamCountryCode?.toUpperCase();
      if (!cc) continue;
      const entry = map.get(cc) ?? { teams: 0, players: 0 };
      entry.players += 1;
      map.set(cc, entry);
    }
    return map;
  }, [countries, teamRelations, players]);

  const profileByCountry = useMemo(() => {
    return new Map(
      countryProfiles.map((p) => [p.countryCode.toUpperCase(), p.description]),
    );
  }, [countryProfiles]);

  const teamsByCountry = useMemo(() => {
    const map = new Map<string, AgencyPublicData["teamRelations"]>();
    for (const rel of teamRelations) {
      const cc = rel.countryCode?.toUpperCase();
      if (!cc) continue;
      const list = map.get(cc) ?? [];
      list.push(rel);
      map.set(cc, list);
    }
    return map;
  }, [teamRelations]);

  if (visible && !visible.visible) return null;
  if (!countries || countries.length === 0) return null;

  return (
    <section id="reach" className="relative scroll-mt-32 space-y-10 isolate">
      <ModuleBackdrop variant="rings" align="center" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15%" }}
        transition={{ duration: 0.6 }}
        className="flex items-end justify-between gap-6 flex-wrap"
      >
        <div className="space-y-3">
          <div
            className="text-[10px] uppercase tracking-[0.4em] font-bold"
            style={{ color: "var(--theme-accent)" }}
          >
            / Alcance
          </div>
          <h2 className="font-heading text-5xl md:text-7xl font-black uppercase leading-[0.9] tracking-tighter text-white">
            Operamos globalmente
          </h2>
        </div>
        <div className="flex items-center gap-3 text-white/60">
          <Globe2 className="h-5 w-5" style={{ color: "var(--theme-accent)" }} />
          <span className="font-mono text-sm flex items-baseline gap-1.5">
            <CountUp value={countries.length} padStart={2} />
            {countries.length === 1 ? "país" : "países"}
          </span>
        </div>
      </motion.div>

      <div className="grid gap-10 lg:grid-cols-12 items-start">
        {/* Country list — left column */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5 space-y-4"
        >
          <GlassCard variant="neutral" radius={20} maxTilt={4} className="p-3">
            <ul className="relative z-20 max-h-[420px] overflow-y-auto pr-1 [scrollbar-width:thin] divide-y divide-white/[0.05]">
              {countries.map((code, idx) => {
                const isActive = active === code;
                const counts = countsByCountry.get(code.toUpperCase()) ?? {
                  teams: 0,
                  players: 0,
                };
                return (
                  <motion.li
                    key={code}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 0.32, delay: Math.min(idx * 0.04, 0.4) }}
                    onMouseEnter={() => setActive(code)}
                    onClick={() => setActive(code)}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-bh-md cursor-pointer transition-colors"
                    style={{
                      backgroundColor: isActive
                        ? "color-mix(in srgb, var(--theme-accent) 10%, transparent)"
                        : undefined,
                    }}
                  >
                    <span
                      className="flex items-center justify-center w-7 h-7 rounded-full transition-all"
                      style={{
                        backgroundColor: isActive
                          ? "color-mix(in srgb, var(--theme-accent) 20%, transparent)"
                          : "rgba(255,255,255,0.04)",
                      }}
                    >
                      <CountryFlag code={code} size={16} />
                    </span>
                    <span
                      className="text-sm font-medium truncate transition-colors"
                      style={{
                        color: isActive
                          ? "var(--theme-accent)"
                          : "rgba(255,255,255,0.85)",
                      }}
                    >
                      {dnEs.of(code) ?? code}
                    </span>
                    <span className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                      {counts.teams > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {counts.teams}
                        </span>
                      )}
                      {counts.players > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {counts.players}
                        </span>
                      )}
                      <span className="text-white/30">{code}</span>
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </GlassCard>

          {/* Active country detail panel */}
          <AnimatePresence mode="wait">
            {active && (
              <CountryDetail
                key={active}
                code={active}
                label={dnEs.of(active) ?? active}
                description={profileByCountry.get(active.toUpperCase()) ?? null}
                counts={countsByCountry.get(active.toUpperCase()) ?? { teams: 0, players: 0 }}
                teams={teamsByCountry.get(active.toUpperCase()) ?? []}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Globe — right column */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="lg:col-span-7 flex justify-center items-center"
        >
          <Globe3D
            countries={countries}
            size={420}
            speed={8}
            activeCode={active}
            onActiveChange={setActive}
            countryLabels={Object.fromEntries(
              countries.map((c) => [c, dnEs.of(c) ?? c]),
            )}
          />
        </motion.div>
      </div>
    </section>
  );
}

function CountryDetail({
  code,
  label,
  description,
  counts,
  teams,
}: {
  code: string;
  label: string;
  description: string | null;
  counts: { teams: number; players: number };
  teams: AgencyPublicData["teamRelations"];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <GlassCard variant="accent" radius={20} className="p-5 space-y-4" maxTilt={3}>
        <div className="relative z-20">
          <div className="flex items-start gap-3">
            <CountryFlag code={code} size={26} />
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-2xl font-black uppercase tracking-tight text-white leading-tight">
                {label}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/60">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3 w-3" style={{ color: "var(--theme-accent)" }} />
                  <CountUp value={counts.players} padStart={2} />
                  jugadores activos
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" style={{ color: "var(--theme-accent)" }} />
                  <CountUp value={counts.teams} padStart={2} />
                  equipos
                </span>
              </div>
            </div>
          </div>

          {description && (
            <p className="mt-4 text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          )}

          {teams.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-[10px] uppercase tracking-[0.3em] text-white/45 font-semibold">
                Clubes con los que trabajamos
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {teams.map((rel) => (
                  <div
                    key={rel.id}
                    className="flex items-center gap-2 rounded-bh-md border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[12px] text-white/85"
                  >
                    {rel.team.crestUrl && rel.team.crestUrl !== "/images/team-default.svg" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rel.team.crestUrl}
                        alt={rel.team.name}
                        className="h-5 w-5 object-contain shrink-0"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded bg-white/[0.06] shrink-0" />
                    )}
                    <span className="truncate font-medium">{rel.team.name}</span>
                    {rel.relationKind === "current" && (
                      <span
                        className="ml-auto text-[9px] uppercase tracking-widest font-bold"
                        style={{ color: "var(--theme-accent)" }}
                      >
                        Actual
                      </span>
                    )}
                    {rel.team.transfermarktUrl && (
                      <a
                        href={rel.team.transfermarktUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-white/35 hover:text-white"
                        aria-label="Transfermarkt"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!description && teams.length === 0 && (
            <p className="mt-3 text-xs italic text-white/45">
              Detalles de operación pendientes de carga.
            </p>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
