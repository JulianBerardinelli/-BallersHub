// /admin/seo/queries — Top queries (búsquedas) que traen tráfico.

import type { Metadata } from "next";
import { getTopQueries, safeGsc } from "@/lib/seo/gsc-queries";
import {
  SeoSubNav,
  ConfigErrorBanner,
  EmptyState,
  fmtNum,
  fmtCtr,
  fmtPosition,
} from "../_shared";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "SEO · Top queries · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminSeoQueriesPage() {
  const result = await safeGsc(() => getTopQueries(28, 100));

  return (
    <main className="space-y-6 p-6 md:p-8">
      <header className="space-y-2 border-b border-bh-fg-4/40 pb-5">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-3">
          Admin · SEO · Queries
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          Top queries (28 días)
        </h1>
        <p className="text-sm leading-[1.55] text-bh-fg-3">
          Las búsquedas que más impresiones nos generan, con CTR y position promedio.
        </p>
      </header>

      <SeoSubNav active="/admin/seo/queries" />

      {!result.ok ? (
        <ConfigErrorBanner error={result.error} />
      ) : result.data.length === 0 ? (
        <EmptyState message="GSC todavía no tiene queries para mostrar. Suele tardar 2-7 días desde el setup en empezar a poblar." />
      ) : (
        <div className="overflow-x-auto rounded-bh-md border border-bh-fg-4/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bh-fg-4/40 bg-bh-surface-2 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-bh-fg-3">
                <th className="px-4 py-3">Query</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">Impresiones</th>
                <th className="px-4 py-3 text-right">CTR</th>
                <th className="px-4 py-3 text-right">Position</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((row, i) => (
                <tr key={`${row.query}-${i}`} className="border-b border-bh-fg-4/20">
                  <td className="px-4 py-3 font-mono text-bh-fg-1">{row.query || "(sin query)"}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtNum(row.clicks)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtNum(row.impressions)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtCtr(row.ctr)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtPosition(row.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
