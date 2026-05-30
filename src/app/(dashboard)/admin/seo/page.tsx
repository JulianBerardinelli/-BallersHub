// /admin/seo — Overview con métricas globales últimos 28 días + KPI summary.

import type { Metadata } from "next";
import { getSearchAnalyticsOverview, safeGsc } from "@/lib/seo/gsc-queries";
import {
  getProPlayersRankTable,
  summarizePlayerRanks,
} from "@/lib/seo/player-rank-tracking";
import {
  SeoSubNav,
  MetricCard,
  ConfigErrorBanner,
  EmptyState,
  fmtNum,
  fmtCtr,
  fmtPosition,
} from "./_shared";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "SEO · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminSeoOverviewPage() {
  const overview = await safeGsc(() => getSearchAnalyticsOverview(28));
  const ranks = await safeGsc(() => getProPlayersRankTable(28));

  return (
    <main className="space-y-6 p-6 md:p-8">
      <header className="space-y-2 border-b border-bh-fg-4/40 pb-5">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-3">
          Admin · SEO
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          SEO overview
        </h1>
        <p className="text-sm leading-[1.55] text-bh-fg-3">
          Métricas de Google Search Console últimos 28 días. Datos cacheados 1h.
        </p>
      </header>

      <SeoSubNav active="/admin/seo" />

      {!overview.ok ? (
        <ConfigErrorBanner error={overview.error} />
      ) : (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Clicks" value={fmtNum(overview.data.clicks)} hint="últimos 28 días" />
          <MetricCard label="Impresiones" value={fmtNum(overview.data.impressions)} hint="últimos 28 días" />
          <MetricCard label="CTR" value={fmtCtr(overview.data.ctr)} hint="clicks / impresiones" />
          <MetricCard label="Position promedio" value={fmtPosition(overview.data.position)} hint="1 = top SERP" />
        </section>
      )}

      <section>
        <h2 className="mb-3 font-bh-display text-xl font-bold uppercase tracking-tight text-bh-fg-1">
          KPI primario: jugadores Pro rankeando por su propio nombre
        </h2>
        {!ranks.ok ? (
          <ConfigErrorBanner error={ranks.error} />
        ) : ranks.data.length === 0 ? (
          <EmptyState message="Todavía no hay jugadores Pro aprobados y públicos. Cuando los haya, esta sección mide qué % rankea en top 3 de Google por su nombre." />
        ) : (
          <PlayerRankSummary rows={ranks.data} />
        )}
      </section>
    </main>
  );
}

function PlayerRankSummary({ rows }: { rows: Awaited<ReturnType<typeof getProPlayersRankTable>> }) {
  const s = summarizePlayerRanks(rows);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <MetricCard
        label="Total Pro players"
        value={fmtNum(s.total)}
        hint="aprobados + públicos"
      />
      <MetricCard
        label="🏆 Winning (top 3)"
        value={fmtNum(s.winning)}
        hint={`${(s.winRate * 100).toFixed(0)}% del total`}
      />
      <MetricCard
        label="⚔️ Fighting (4-10)"
        value={fmtNum(s.fighting)}
        hint="primera página"
      />
      <MetricCard
        label="👻 Missing"
        value={fmtNum(s.missing)}
        hint="sin data / fuera del top 10"
      />
    </div>
  );
}
