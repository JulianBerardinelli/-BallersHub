import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { ArrowLeft, ArrowRight, Clock, Layers, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { marketingDripConfigs, marketingDripEnrollments } from "@/db/schema";
import { TEMPLATE_DESCRIPTORS } from "@/emails";
import DripActiveSwitch from "./DripActiveSwitch";

export const dynamic = "force-dynamic";

export default async function DripsAdminPage() {
  // Pull every drip + per-status counts (via grouped subquery).
  const configs = await db
    .select()
    .from(marketingDripConfigs)
    .orderBy(asc(marketingDripConfigs.triggerEvent), asc(marketingDripConfigs.delaySeconds));

  const counts = await db
    .select({
      dripId: marketingDripEnrollments.dripId,
      status: marketingDripEnrollments.status,
      total: sql<number>`count(*)::int`,
    })
    .from(marketingDripEnrollments)
    .groupBy(marketingDripEnrollments.dripId, marketingDripEnrollments.status);

  const countsByDrip = new Map<string, Record<string, number>>();
  for (const r of counts) {
    const map = countsByDrip.get(r.dripId) ?? {};
    map[r.status] = Number(r.total);
    countsByDrip.set(r.dripId, map);
  }

  const triggers = Array.from(new Set(configs.map((c) => c.triggerEvent)));
  const templateLabel = new Map<string, string>(
    TEMPLATE_DESCRIPTORS.map((t) => [t.key, t.label]),
  );

  return (
    <div className="space-y-6">
      <Link
        href="/admin/marketing"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-bh-fg-3 hover:text-bh-lime"
      >
        <ArrowLeft className="size-3" />
        Volver a marketing
      </Link>

      <header className="space-y-1">
        <h2 className="font-bh-display text-2xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1">
          Drips automatizados
        </h2>
        <p className="text-sm leading-[1.55] text-bh-fg-3">
          Cada drip es un step que se dispara automáticamente al ocurrir un evento (signup,
          lead capture). Los pasos múltiples comparten el mismo trigger y se ordenan por delay.
          Pausá el switch para detener nuevos enrollments — los que ya están en cola siguen
          corriendo.
        </p>
      </header>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<Layers className="size-4" />}
          label="Drips activos"
          value={configs.filter((c) => c.isActive).length.toString()}
          subtitle={`de ${configs.length} totales`}
          tone="lime"
        />
        <Stat
          icon={<Clock className="size-4" />}
          label="Enrollments pendientes"
          value={sumStatus(countsByDrip, "pending").toLocaleString("es-AR")}
        />
        <Stat
          icon={<Zap className="size-4" />}
          label="Enviados (total)"
          value={sumStatus(countsByDrip, "sent").toLocaleString("es-AR")}
        />
        <Stat
          icon={<ArrowRight className="size-4" />}
          label="Exited / cancelled"
          value={(
            sumStatus(countsByDrip, "exited") + sumStatus(countsByDrip, "cancelled")
          ).toLocaleString("es-AR")}
          subtitle="exit conditions + unsubs"
          tone="muted"
        />
      </div>

      {/* Per-trigger groups */}
      {triggers.map((trigger) => {
        const group = configs.filter((c) => c.triggerEvent === trigger);
        return (
          <section
            key={trigger}
            className="space-y-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1"
          >
            <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div>
                <h3 className="font-bh-display text-sm font-bold uppercase tracking-[0.06em] text-bh-fg-1">
                  Trigger: <span className="text-bh-lime">{trigger}</span>
                </h3>
                <p className="text-[11px] text-bh-fg-4">
                  {group.length} {group.length === 1 ? "step" : "steps"} en orden de delay
                </p>
              </div>
            </header>

            <div className="px-5 pb-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <Th>Step</Th>
                    <Th>Template</Th>
                    <Th>Delay</Th>
                    <Th align="right">Pendientes</Th>
                    <Th align="right">Enviados</Th>
                    <Th align="right">Exited</Th>
                    <Th align="right">Activo</Th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((c) => {
                    const count = countsByDrip.get(c.id) ?? {};
                    return (
                      <tr key={c.id} className="border-b border-white/[0.03] last:border-b-0">
                        <Td>
                          <div className="flex flex-col">
                            <span className="font-medium text-bh-fg-1">{c.name}</span>
                            <span className="font-bh-mono text-[11px] text-bh-fg-4">{c.slug}</span>
                            {c.description ? (
                              <span className="mt-1 text-[11px] text-bh-fg-3">{c.description}</span>
                            ) : null}
                            {c.exitCondition ? (
                              <span className="mt-1 inline-flex w-fit items-center rounded-full border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-bh-fg-3">
                                exit: {c.exitCondition}
                              </span>
                            ) : null}
                          </div>
                        </Td>
                        <Td>
                          <span className="text-[12px] text-bh-fg-2">
                            {templateLabel.get(c.templateKey) ?? c.templateKey}
                          </span>
                        </Td>
                        <Td>
                          <span className="font-bh-mono text-[12px] text-bh-fg-2">
                            {formatDelay(c.delaySeconds)}
                          </span>
                        </Td>
                        <Td align="right">
                          <span className="font-bh-mono text-[12px] text-bh-fg-1">
                            {(count.pending ?? 0).toLocaleString("es-AR")}
                          </span>
                        </Td>
                        <Td align="right">
                          <span className="font-bh-mono text-[12px] text-bh-fg-2">
                            {(count.sent ?? 0).toLocaleString("es-AR")}
                          </span>
                        </Td>
                        <Td align="right">
                          <span className="font-bh-mono text-[12px] text-bh-fg-3">
                            {((count.exited ?? 0) + (count.cancelled ?? 0)).toLocaleString("es-AR")}
                          </span>
                        </Td>
                        <Td align="right">
                          <DripActiveSwitch dripId={c.id} initial={c.isActive} />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {triggers.length === 0 ? (
        <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 px-5 py-12 text-center">
          <p className="text-sm text-bh-fg-3">No hay drips configurados todavía.</p>
        </div>
      ) : null}
    </div>
  );
}

function sumStatus(map: Map<string, Record<string, number>>, status: string): number {
  let n = 0;
  for (const counts of map.values()) n += counts[status] ?? 0;
  return n;
}

function formatDelay(seconds: number): string {
  if (seconds === 0) return "inmediato";
  const days = seconds / 86400;
  if (Number.isInteger(days)) return `${days}d`;
  const hours = seconds / 3600;
  if (Number.isInteger(hours)) return `${hours}h`;
  const minutes = seconds / 60;
  if (Number.isInteger(minutes)) return `${minutes}m`;
  return `${seconds}s`;
}

function Stat({
  icon,
  label,
  value,
  subtitle,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  tone?: "default" | "lime" | "muted";
}) {
  const accent =
    tone === "lime" ? "text-bh-lime" : tone === "muted" ? "text-bh-fg-3" : "text-bh-fg-1";
  return (
    <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-4">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-4">
        <span className="text-bh-fg-3">{icon}</span>
        {label}
      </div>
      <div className={`font-bh-display text-2xl font-bold leading-none ${accent}`}>{value}</div>
      {subtitle ? <div className="mt-1.5 text-[11px] text-bh-fg-4">{subtitle}</div> : null}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      className={`px-3 py-2 font-bh-display text-[10px] font-bold uppercase tracking-[0.1em] text-bh-fg-4 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <td className={`px-3 py-3 align-top ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </td>
  );
}
