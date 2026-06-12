import { Link } from "@/i18n/navigation";
import { ArrowLeft, ArrowRight, Clock, Layers, Zap } from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { TEMPLATE_DESCRIPTORS } from "@/emails";
import DripActiveSwitch from "./DripActiveSwitch";

export const dynamic = "force-dynamic";

// Render-time shape mapped from Supabase REST snake_case → camelCase
// so the JSX below stays unchanged.
type DripConfigRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  templateKey: string;
  delaySeconds: number;
  triggerEvent: string;
  exitCondition: string | null;
  isActive: boolean;
};

export default async function DripsAdminPage() {
  // Migrated to Supabase REST. Drizzle/postgres-js + Vercel + Supavisor
  // leaves ClientRead zombies; see HANDOFF.md / PERFORMANCE_PLAN.md.
  const supabase = createSupabaseAdmin();

  const [configsRes, enrollmentsRes] = await Promise.all([
    supabase
      .from("marketing_drip_configs")
      .select(
        "id, slug, name, description, template_key, delay_seconds, trigger_event, exit_condition, is_active",
      )
      .order("trigger_event", { ascending: true })
      .order("delay_seconds", { ascending: true }),
    // No GROUP BY in PostgREST — pull enrollments (drip_id, status)
    // and aggregate in memory. Table stays small enough for now; if
    // it grows large, replace with an RPC or materialized view.
    supabase
      .from("marketing_drip_enrollments")
      .select("drip_id, status"),
  ]);

  const configs: DripConfigRow[] = (configsRes.data ?? []).map((c) => ({
    id: c.id as string,
    slug: c.slug as string,
    name: c.name as string,
    description: (c.description as string | null) ?? null,
    templateKey: c.template_key as string,
    delaySeconds: Number(c.delay_seconds ?? 0),
    triggerEvent: c.trigger_event as string,
    exitCondition: (c.exit_condition as string | null) ?? null,
    isActive: Boolean(c.is_active),
  }));

  const countsByDrip = new Map<string, Record<string, number>>();
  for (const r of (enrollmentsRes.data ?? []) as Array<{
    drip_id: string;
    status: string;
  }>) {
    const map = countsByDrip.get(r.drip_id) ?? {};
    map[r.status] = (map[r.status] ?? 0) + 1;
    countsByDrip.set(r.drip_id, map);
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

            {/* Desktop table */}
            <div className="hidden px-5 pb-4 md:block">
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

            {/* Mobile card list */}
            <div className="space-y-2 p-3 md:hidden">
              {group.map((c) => {
                const count = countsByDrip.get(c.id) ?? {};
                return (
                  <div
                    key={c.id}
                    className="rounded-bh-md border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-bh-fg-1">{c.name}</p>
                        <p className="truncate font-bh-mono text-[10px] text-bh-fg-4">{c.slug}</p>
                        <p className="mt-1 truncate text-[11px] text-bh-fg-3">
                          {templateLabel.get(c.templateKey) ?? c.templateKey}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center rounded-full border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 font-bh-mono text-[10px] font-medium text-bh-fg-2">
                            {formatDelay(c.delaySeconds)}
                          </span>
                          {c.exitCondition ? (
                            <span className="inline-flex items-center rounded-full border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-bh-fg-3">
                              exit: {c.exitCondition}
                            </span>
                          ) : null}
                        </div>
                        {c.description ? (
                          <p className="mt-1.5 text-[11px] leading-snug text-bh-fg-3">
                            {c.description}
                          </p>
                        ) : null}
                      </div>
                      <DripActiveSwitch dripId={c.id} initial={c.isActive} />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.04] pt-2 text-center">
                      <DripMobileStat
                        label="Pend."
                        value={(count.pending ?? 0).toLocaleString("es-AR")}
                      />
                      <DripMobileStat
                        label="Enviados"
                        value={(count.sent ?? 0).toLocaleString("es-AR")}
                      />
                      <DripMobileStat
                        label="Exited"
                        value={(
                          (count.exited ?? 0) + (count.cancelled ?? 0)
                        ).toLocaleString("es-AR")}
                      />
                    </div>
                  </div>
                );
              })}
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

function DripMobileStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-bh-mono text-[12px] text-bh-fg-1">{value}</div>
      <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-bh-fg-4">
        {label}
      </div>
    </div>
  );
}
