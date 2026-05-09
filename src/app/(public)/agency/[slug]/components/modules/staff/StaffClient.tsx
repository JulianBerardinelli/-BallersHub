"use client";

import { motion } from "framer-motion";
import { UserCircle2, Award, ExternalLink } from "lucide-react";
import CountUp from "@/components/ui/CountUp";
import GlassCard from "@/components/ui/GlassCard";
import ModuleBackdrop from "../../ModuleBackdrop";

export type StaffMember = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  licenses?: Array<{ type: string; number: string; url?: string }>;
};

const ROLE_LABEL: Record<string, string> = {
  manager: "Manager",
  member: "Colaborador",
  admin: "Admin",
  reviewer: "Reviewer",
};

export default function StaffClient({ staff }: { staff: StaffMember[] }) {
  return (
    <section id="staff" className="relative scroll-mt-32 space-y-10 isolate">
      <ModuleBackdrop variant="soft" align="right" />
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
            / Equipo
          </div>
          <h2 className="font-heading text-5xl md:text-7xl font-black uppercase leading-[0.9] tracking-tighter text-white">
            Quiénes representan
          </h2>
          <p className="text-white/60 text-lg font-light max-w-xl">
            Mánagers y colaboradores que integran la agencia.
          </p>
        </div>
        <div className="flex items-center gap-3 text-white/60">
          <UserCircle2 className="h-5 w-5" style={{ color: "var(--theme-accent)" }} />
          <span className="font-mono text-sm flex items-baseline gap-1.5">
            <CountUp value={staff.length} padStart={2} />
            {staff.length === 1 ? "integrante" : "integrantes"}
          </span>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((m, idx) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.5, delay: Math.min(idx * 0.05, 0.4) }}
            className="h-full"
          >
            <GlassCard variant="neutral" radius={18} className="p-5">
            <div className="relative flex items-start gap-4">
              <div
                className="h-16 w-16 shrink-0 rounded-full overflow-hidden border-2 flex items-center justify-center"
                style={{
                  borderColor: "color-mix(in srgb, var(--theme-accent) 40%, transparent)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatarUrl} alt={m.fullName} className="h-full w-full object-cover" />
                ) : (
                  <span
                    className="font-heading font-black text-xl uppercase"
                    style={{ color: "var(--theme-accent)" }}
                  >
                    {m.fullName
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join("")}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="font-heading text-lg font-bold uppercase tracking-tight text-white leading-tight truncate">
                  {m.fullName}
                </h3>
                <p
                  className="text-[10px] uppercase tracking-[0.3em] font-semibold"
                  style={{ color: "var(--theme-accent)" }}
                >
                  {ROLE_LABEL[m.role] ?? m.role}
                </p>
              </div>
            </div>

            {m.bio && (
              <p className="relative mt-4 text-sm text-white/65 leading-relaxed line-clamp-3">
                {m.bio}
              </p>
            )}

            {m.licenses && m.licenses.length > 0 && (
              <div className="relative mt-4 flex flex-wrap gap-1.5">
                {m.licenses.map((lic, idx) => (
                  <span
                    key={`${m.id}-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/85"
                    style={{
                      border: "1px solid rgba(255,255,255,0.10)",
                      backgroundColor: "rgba(255,255,255,0.04)",
                    }}
                  >
                    <Award className="h-3 w-3" style={{ color: "var(--theme-accent)" }} />
                    <span>{lic.type}</span>
                    <span className="text-white/30">·</span>
                    <span className="text-white/55">{lic.number}</span>
                    {lic.url && (
                      <a
                        href={lic.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-0.5 hover:text-white"
                        style={{ color: "var(--theme-accent)" }}
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </span>
                ))}
              </div>
            )}
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
