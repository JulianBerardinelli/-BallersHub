// Wrappers de Search Console API para el panel /admin/seo.
//
// Todas las funciones devuelven datos serializables (sin instancias de
// Google clients) para que se puedan pasar de Server Components a Client
// Components sin issues.
//
// Cache:
//   - Los datos de GSC se actualizan diariamente (a veces con 2-3 días de
//     delay). Cacheamos con `unstable_cache` por 1h para no martillar la
//     API (que tiene quota de 50.000 queries/día por property).
//   - Los UNSTABLE_CACHE_TAGS permiten invalidar manualmente desde un
//     futuro botón "refresh" en el admin.

import { unstable_cache as cache } from "next/cache";
import {
  getSearchConsoleClient,
  getGscSiteUrl,
  GoogleApiConfigError,
} from "./google-clients";

// ============================================================================
// Tipos públicos (lo que devuelven las queries)
// ============================================================================

export type GscMetrics = {
  clicks: number;
  impressions: number;
  ctr: number; // 0..1
  position: number; // 1-based, promedio
};

export type GscQueryRow = GscMetrics & { query: string };
export type GscPageRow = GscMetrics & { page: string };

export type GscInspectionResult = {
  url: string;
  indexStatus: "PASS" | "PARTIAL" | "FAIL" | "NEUTRAL" | "UNKNOWN";
  verdict: string; // human-readable
  lastCrawlTime: string | null;
  coverageState: string | null; // ej. "Submitted and indexed"
  googleCanonical: string | null;
  userCanonical: string | null;
};

// ============================================================================
// Helpers internos
// ============================================================================

/** Fecha YYYY-MM-DD `daysAgo` antes de hoy (UTC). */
function dateNDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================================
// Queries — Search Analytics
// ============================================================================

/**
 * Métricas totales (clicks/impressions/ctr/position promedio) para los
 * últimos `days` días. Datos crudos sin breakdown.
 */
export const getSearchAnalyticsOverview = cache(
  async (days = 28): Promise<GscMetrics> => {
    const client = getSearchConsoleClient();
    const siteUrl = getGscSiteUrl();
    const res = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: dateNDaysAgo(days),
        endDate: today(),
        dimensions: [],
        rowLimit: 1,
      },
    });
    const row = res.data.rows?.[0];
    return {
      clicks: row?.clicks ?? 0,
      impressions: row?.impressions ?? 0,
      ctr: row?.ctr ?? 0,
      position: row?.position ?? 0,
    };
  },
  ["gsc-overview"],
  { revalidate: 3600, tags: ["gsc"] },
);

/**
 * Top N queries por clicks. Devuelve la query exacta + métricas.
 */
export const getTopQueries = cache(
  async (days = 28, limit = 50): Promise<GscQueryRow[]> => {
    const client = getSearchConsoleClient();
    const siteUrl = getGscSiteUrl();
    const res = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: dateNDaysAgo(days),
        endDate: today(),
        dimensions: ["query"],
        rowLimit: limit,
      },
    });
    return (res.data.rows ?? []).map((r) => ({
      query: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }));
  },
  ["gsc-top-queries"],
  { revalidate: 3600, tags: ["gsc"] },
);

/**
 * Top N pages por clicks.
 */
export const getTopPages = cache(
  async (days = 28, limit = 50): Promise<GscPageRow[]> => {
    const client = getSearchConsoleClient();
    const siteUrl = getGscSiteUrl();
    const res = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: dateNDaysAgo(days),
        endDate: today(),
        dimensions: ["page"],
        rowLimit: limit,
      },
    });
    return (res.data.rows ?? []).map((r) => ({
      page: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }));
  },
  ["gsc-top-pages"],
  { revalidate: 3600, tags: ["gsc"] },
);

/**
 * Métricas filtradas por una query exacta. Usado por el KPI primario
 * (rank de un player por su propio nombre).
 */
export const getMetricsForQuery = cache(
  async (query: string, days = 28): Promise<GscMetrics | null> => {
    if (!query.trim()) return null;
    const client = getSearchConsoleClient();
    const siteUrl = getGscSiteUrl();
    const res = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: dateNDaysAgo(days),
        endDate: today(),
        dimensions: [],
        dimensionFilterGroups: [
          {
            filters: [
              { dimension: "query", operator: "equals", expression: query },
            ],
          },
        ],
        rowLimit: 1,
      },
    });
    const row = res.data.rows?.[0];
    if (!row) return null;
    return {
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    };
  },
  ["gsc-metrics-for-query"],
  { revalidate: 3600, tags: ["gsc"] },
);

// ============================================================================
// URL Inspection (estado de indexación de una URL específica)
// ============================================================================

/**
 * Inspección de URL: ¿está indexada? ¿cuándo fue el último crawl?
 * Útil para chequear los portfolios de jugadores 1-a-1.
 *
 * NOTA: la URL Inspection API es read-only, no permite "request indexing"
 * (eso solo se hace desde la UI de GSC manualmente).
 */
export const inspectUrl = cache(
  async (url: string): Promise<GscInspectionResult> => {
    const client = getSearchConsoleClient();
    const siteUrl = getGscSiteUrl();
    const res = await client.urlInspection.index.inspect({
      requestBody: { siteUrl, inspectionUrl: url, languageCode: "es-AR" },
    });
    const r = res.data.inspectionResult;
    const idx = r?.indexStatusResult;
    return {
      url,
      indexStatus: (idx?.verdict ?? "UNKNOWN") as GscInspectionResult["indexStatus"],
      verdict: idx?.verdict ?? "UNKNOWN",
      lastCrawlTime: idx?.lastCrawlTime ?? null,
      coverageState: idx?.coverageState ?? null,
      googleCanonical: idx?.googleCanonical ?? null,
      userCanonical: idx?.userCanonical ?? null,
    };
  },
  ["gsc-inspect"],
  { revalidate: 3600, tags: ["gsc"] },
);

// ============================================================================
// Safe wrapper para Server Components
// ============================================================================

/**
 * Envuelve una query GSC y devuelve `{ ok, data, error }` para que el RSC
 * pueda renderizar un estado de error claro sin crashear el árbol.
 */
export async function safeGsc<T>(
  fn: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof GoogleApiConfigError) {
      return { ok: false, error: err.message };
    }
    const msg = err instanceof Error ? err.message : "Error desconocido al consultar GSC";
    console.error("[gsc-queries] error:", err);
    return { ok: false, error: msg };
  }
}
