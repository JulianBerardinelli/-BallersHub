// /admin/seo/funnel — Embudo de conversión del tráfico orgánico (GA4, iter-2).

import type { Metadata } from "next";
import {
  getOrganicFunnel,
  deriveFunnelStages,
  safeGa4,
  type FunnelStage,
} from "@/lib/seo/ga4-queries";
import { SeoSubNav, ConfigErrorBanner, EmptyState, fmtNum } from "../_shared";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "SEO · Funnel · Admin",
  robots: { index: false, follow: false },
};

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export default async function AdminSeoFunnelPage() {
  const result = await safeGa4(() => getOrganicFunnel(28));
  const stages = result.ok ? deriveFunnelStages(result.data) : [];
  const empty = result.ok && (stages[0]?.count ?? 0) === 0;

  return (
    <main className="space-y-6 p-6 md:p-8">
      <header className="space-y-2 border-b border-bh-fg-4/40 pb-5">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-3">
          Admin · SEO · Funnel
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          Funnel de conversión orgánica (28 días)
        </h1>
        <p className="text-sm leading-[1.55] text-bh-fg-3">
          De sesiones orgánicas a Pro. Cada etapa muestra su conversión vs la
          anterior y vs el tope del embudo. Fuente: GA4 (eventos
          <code className="mx-1 rounded bg-bh-surface-2 px-1 py-0.5 text-[11px]">sign_up</code>
          /
          <code className="mx-1 rounded bg-bh-surface-2 px-1 py-0.5 text-[11px]">pro_activation</code>
          ), tráfico Organic Search.
        </p>
      </header>

      <SeoSubNav active="/admin/seo/funnel" />

      {!result.ok ? (
        <ConfigErrorBanner error={result.error} />
      ) : empty ? (
        <EmptyState message="GA4 todavía no registró sesiones orgánicas. Suele tardar 24-48h desde el setup del tag + que empiece a llegar tráfico orgánico." />
      ) : (
        <div className="space-y-3">
          {stages.map((s) => (
            <FunnelRow key={s.label} stage={s} />
          ))}
        </div>
      )}
    </main>
  );
}

function FunnelRow({ stage }: { stage: FunnelStage }) {
  // Min 2% width so a non-zero stage is always visible as a sliver.
  const widthPct = stage.count > 0 ? Math.max(stage.pctFromTop * 100, 2) : 0;
  return (
    <div className="rounded-bh-md border border-bh-fg-4/40 bg-bh-surface-1 p-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-bh-fg-3">
          {stage.label}
        </span>
        <span className="font-bh-display text-2xl font-bold text-bh-fg-1">
          {fmtNum(stage.count)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-bh-surface-2">
        <div
          className="h-full rounded-full bg-bh-lime transition-[width]"
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-bh-fg-3">
        <span>
          {stage.pctFromPrev === null ? (
            "Tope del embudo"
          ) : (
            <>
              <span className="font-semibold text-bh-fg-2">
                {pct(stage.pctFromPrev)}
              </span>{" "}
              vs etapa previa
            </>
          )}
        </span>
        <span>{pct(stage.pctFromTop)} del tope</span>
      </div>
    </div>
  );
}
