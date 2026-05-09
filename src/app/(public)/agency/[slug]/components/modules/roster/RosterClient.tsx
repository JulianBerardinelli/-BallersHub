"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Users } from "lucide-react";
import CountryFlag from "@/components/common/CountryFlag";
import CountUp from "@/components/ui/CountUp";
import GlassCard from "@/components/ui/GlassCard";
import ModuleBackdrop from "../../ModuleBackdrop";
import { formatMarketValueEUR } from "@/lib/format";

type Player = {
  id: string;
  slug: string;
  fullName: string;
  avatarUrl: string | null;
  heroUrl: string | null;
  positions: string[] | null;
  currentClub: string | null;
  nationality: string[] | null;
  nationalityCodes: string[] | null;
  marketValueEur: number | null;
};

export default function RosterClient({ players }: { players: Player[] }) {
  const dnEs = new Intl.DisplayNames(["es"], { type: "region", fallback: "code" });

  return (
    <section id="roster" className="relative scroll-mt-32 space-y-10 isolate">
      <ModuleBackdrop variant="soft" align="left" />
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
            / Roster
          </div>
          <h2 className="font-heading text-5xl md:text-7xl font-black uppercase leading-[0.9] tracking-tighter text-white">
            Jugadores Representados
          </h2>
        </div>

        <div className="flex items-center gap-3 text-white/60">
          <Users className="h-5 w-5" style={{ color: "var(--theme-accent)" }} />
          <span className="font-mono text-sm flex items-baseline gap-1.5">
            <CountUp value={players.length} padStart={2} />
            {players.length === 1 ? "jugador" : "jugadores"} activos
          </span>
        </div>
      </motion.div>

      {players.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed py-20 text-center"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p className="text-white/60">
            Esta agencia aún no tiene jugadores con perfil público.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {players.map((p, idx) => {
            const cover = p.heroUrl || p.avatarUrl || "/images/player-default.jpg";
            const flag = (p.nationalityCodes && p.nationalityCodes[0])
              || (p.nationality && p.nationality[0])
              || null;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.55, delay: Math.min(idx * 0.05, 0.4) }}
                className="h-full"
              >
                <GlassCard variant="neutral" radius={18} className="h-full">
                  <Link
                    href={`/${p.slug}`}
                    className="group relative z-20 flex h-full flex-col"
                  >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cover}
                      alt={p.fullName}
                      className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

                    <div
                      className="absolute top-4 right-4 inline-flex items-center justify-center w-10 h-10 rounded-full opacity-0 transition-all duration-300 group-hover:opacity-100"
                      style={{
                        backgroundColor: "var(--theme-accent)",
                        color: "var(--theme-background)",
                      }}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </div>

                    {p.positions && p.positions.length > 0 && (
                      <div
                        className="absolute top-4 left-4 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                        style={{
                          backgroundColor: "rgba(0,0,0,0.6)",
                          backdropFilter: "blur(8px)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          color: "var(--theme-accent)",
                        }}
                      >
                        {p.positions[0]}
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4 right-4 space-y-1">
                      <h3 className="font-heading text-2xl font-black uppercase leading-tight text-white">
                        {p.fullName}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-white/70">
                        {flag && <CountryFlag code={flag} size={14} />}
                        {p.currentClub && <span className="truncate">{p.currentClub}</span>}
                      </div>
                    </div>
                  </div>

                  {p.marketValueEur != null && (
                    <div
                      className="flex items-center justify-between px-4 py-3 text-xs"
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        backgroundColor: "rgba(0,0,0,0.4)",
                      }}
                    >
                      <span className="text-white/40 uppercase tracking-[0.18em] font-semibold">
                        Valor mercado
                      </span>
                      <span
                        className="font-mono font-bold"
                        style={{ color: "var(--theme-accent)" }}
                      >
                        {formatMarketValueEUR(p.marketValueEur)}
                      </span>
                    </div>
                  )}
                  </Link>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
