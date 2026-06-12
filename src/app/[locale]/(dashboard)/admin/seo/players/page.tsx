// /admin/seo/players — KPI primario: tabla de Pro players con su rank
// por own-name query en GSC.

import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { safeGsc } from "@/lib/seo/gsc-queries";
import {
  getProPlayersRankTable,
  summarizePlayerRanks,
  type PlayerRankRow,
} from "@/lib/seo/player-rank-tracking";
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
  title: "SEO · Players · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminSeoPlayersPage() {
  const result = await safeGsc(() => getProPlayersRankTable(28));

  return (
    <main className="space-y-6 p-6 md:p-8">
      <header className="space-y-2 border-b border-bh-fg-4/40 pb-5">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-3">
          Admin · SEO · KPI primario
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          Players winning their own name SERP
        </h1>
        <p className="text-sm leading-[1.55] text-bh-fg-3">
          Por cada Pro player aprobado y público: position promedio en
          Google cuando alguien busca su nombre. Últimos 28 días.
        </p>
      </header>

      <SeoSubNav active="/admin/seo/players" />

      {!result.ok ? (
        <ConfigErrorBanner error={result.error} />
      ) : result.data.length === 0 ? (
        <EmptyState message="Todavía no hay Pro players aprobados con visibilidad pública. Cuando los haya, aparecen acá con su rank de Google por su nombre." />
      ) : (
        <RankTable rows={result.data} />
      )}
    </main>
  );
}

function RankTable({ rows }: { rows: PlayerRankRow[] }) {
  const s = summarizePlayerRanks(rows);
  return (
    <>
      <div className="rounded-bh-md border border-bh-fg-4/40 bg-bh-surface-1 p-4 text-sm">
        <strong className="text-bh-fg-1">{s.winning}</strong> de {s.total} jugadores rankean en el top 3 para su propio nombre.
        {" "}<span className="text-bh-fg-3">
          ({s.fighting} en primera página, {s.missing} fuera del top 10 o sin data.)
        </span>
      </div>

      <div className="overflow-x-auto rounded-bh-md border border-bh-fg-4/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bh-fg-4/40 bg-bh-surface-2 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-bh-fg-3">
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Position</th>
              <th className="px-4 py-3 text-right">Clicks</th>
              <th className="px-4 py-3 text-right">Impresiones</th>
              <th className="px-4 py-3 text-right">CTR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className="border-b border-bh-fg-4/20">
                <td className="px-4 py-3">
                  <Link
                    href={`/${r.slug}`}
                    className="font-semibold text-bh-fg-1 hover:text-bh-lime hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {r.fullName}
                  </Link>
                  <div className="text-[11px] text-bh-fg-3">
                    query:{" "}<span className="font-mono">{r.query}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-right font-mono">{fmtPosition(r.position)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtNum(r.clicks)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtNum(r.impressions)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtCtr(r.ctr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: PlayerRankRow["status"] }) {
  const map = {
    winning: { label: "🏆 Winning", cls: "border-bh-lime/40 bg-bh-lime/10 text-bh-lime" },
    fighting: { label: "⚔️ Fighting", cls: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
    missing: { label: "👻 Missing", cls: "border-bh-fg-4 bg-bh-surface-2 text-bh-fg-3" },
  } as const;
  const { label, cls } = map[status];
  return (
    <span
      className={
        "inline-flex items-center rounded-bh-pill border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] " +
        cls
      }
    >
      {label}
    </span>
  );
}
