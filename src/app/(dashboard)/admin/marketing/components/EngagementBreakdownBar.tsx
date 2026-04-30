import Link from "next/link";
import { ArrowUpRight, Activity } from "lucide-react";
import type { EngagementBreakdown } from "@/lib/marketing";

/**
 * 4-segment progress bar for the marketing dashboard. Active / warm /
 * cold / dormant share the row, with their absolute counts shown below.
 *
 * `dormant` subscribers are the ones the daily cron auto-suppresses —
 * surfacing them here lets the admin act before deliverability suffers.
 */
export default function EngagementBreakdownBar({
  breakdown,
}: {
  breakdown: EngagementBreakdown;
}) {
  const total = Math.max(1, breakdown.total); // avoid /0
  const pct = (n: number) => (n / total) * 100;

  return (
    <section className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-bh-fg-3" />
          <h3 className="font-bh-display text-sm font-bold uppercase tracking-[0.06em] text-bh-fg-1">
            Engagement
          </h3>
          <span className="text-[11px] uppercase tracking-[0.08em] text-bh-fg-4">
            · {breakdown.total.toLocaleString("es-AR")} suscriptores
          </span>
        </div>
        <Link
          href="/admin/marketing/engagement"
          className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-3 hover:text-bh-lime"
        >
          Detalle
          <ArrowUpRight className="size-3" />
        </Link>
      </header>

      {breakdown.total === 0 ? (
        <p className="text-sm text-bh-fg-3">
          Aún no hay suscriptores trackeados — los datos se irán llenando a medida
          que mandes campañas.
        </p>
      ) : (
        <>
          {/* Stacked bar */}
          <div
            className="flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06]"
            role="img"
            aria-label="Distribución de engagement"
          >
            <span
              style={{ width: `${pct(breakdown.active)}%` }}
              className="bg-bh-lime"
              title={`Active: ${breakdown.active}`}
            />
            <span
              style={{ width: `${pct(breakdown.warm)}%` }}
              className="bg-bh-blue"
              title={`Warm: ${breakdown.warm}`}
            />
            <span
              style={{ width: `${pct(breakdown.cold)}%` }}
              className="bg-bh-warning"
              title={`Cold: ${breakdown.cold}`}
            />
            <span
              style={{ width: `${pct(breakdown.dormant)}%` }}
              className="bg-bh-danger"
              title={`Dormant: ${breakdown.dormant}`}
            />
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Legend label="Active" count={breakdown.active} pct={pct(breakdown.active)} colorClass="bg-bh-lime" />
            <Legend label="Warm"   count={breakdown.warm}   pct={pct(breakdown.warm)}   colorClass="bg-bh-blue" />
            <Legend label="Cold"   count={breakdown.cold}   pct={pct(breakdown.cold)}   colorClass="bg-bh-warning" />
            <Legend label="Dormant" count={breakdown.dormant} pct={pct(breakdown.dormant)} colorClass="bg-bh-danger" />
          </div>
        </>
      )}
    </section>
  );
}

function Legend({
  label,
  count,
  pct,
  colorClass,
}: {
  label: string;
  count: number;
  pct: number;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`mt-0.5 size-2.5 shrink-0 rounded-full ${colorClass}`} />
      <div className="min-w-0 leading-tight">
        <div className="font-bh-display text-[11px] font-bold uppercase tracking-[0.06em] text-bh-fg-2">
          {label}
        </div>
        <div className="font-bh-mono text-[12px] text-bh-fg-1">
          {count.toLocaleString("es-AR")}{" "}
          <span className="text-bh-fg-4">({pct.toFixed(1)}%)</span>
        </div>
      </div>
    </div>
  );
}
