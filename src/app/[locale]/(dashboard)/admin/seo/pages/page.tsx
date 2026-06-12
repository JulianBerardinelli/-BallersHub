// /admin/seo/pages — Top URLs por clicks/impressions en GSC.

import type { Metadata } from "next";
import Link from "next/link";
import { getTopPages, safeGsc } from "@/lib/seo/gsc-queries";
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
  title: "SEO · Top pages · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminSeoPagesPage() {
  const result = await safeGsc(() => getTopPages(28, 100));

  return (
    <main className="space-y-6 p-6 md:p-8">
      <header className="space-y-2 border-b border-bh-fg-4/40 pb-5">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-3">
          Admin · SEO · Pages
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          Top pages (28 días)
        </h1>
        <p className="text-sm leading-[1.55] text-bh-fg-3">
          Las URLs del sitio que más tráfico orgánico están atrayendo.
        </p>
      </header>

      <SeoSubNav active="/admin/seo/pages" />

      {!result.ok ? (
        <ConfigErrorBanner error={result.error} />
      ) : result.data.length === 0 ? (
        <EmptyState message="GSC todavía no tiene páginas con tráfico para mostrar. Suele tardar 2-7 días desde el setup." />
      ) : (
        <div className="overflow-x-auto rounded-bh-md border border-bh-fg-4/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bh-fg-4/40 bg-bh-surface-2 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-bh-fg-3">
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">Impresiones</th>
                <th className="px-4 py-3 text-right">CTR</th>
                <th className="px-4 py-3 text-right">Position</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((row, i) => (
                <tr key={`${row.page}-${i}`} className="border-b border-bh-fg-4/20">
                  <td className="px-4 py-3">
                    <Link
                      href={pathFromUrl(row.page)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-bh-fg-1 hover:text-bh-lime hover:underline"
                    >
                      {pathFromUrl(row.page)}
                    </Link>
                  </td>
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

function pathFromUrl(url: string): string {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
}
