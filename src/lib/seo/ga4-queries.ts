// GA4 Data API wrappers para el panel /admin/seo/funnel (iter-2).
//
// Mide el embudo de conversión del tráfico ORGÁNICO:
//   sesiones orgánicas → vieron /pricing → signups → activaciones Pro
//
// Mismo patrón que gsc-queries.ts: `unstable_cache` 1h, datos serializables,
// y un `safeGa4` wrapper que devuelve `{ok,data}|{ok:false,error}` para que
// el RSC degrade graciosamente cuando falta config (banner amarillo).
//
// Los eventos `sign_up` y `pro_activation` los emite el tag GA4 de la Fase A
// (src/lib/analytics/ga.ts). Marcarlos como key events en GA4 Admin.

import { unstable_cache as cache } from "next/cache";
import {
  getAnalyticsDataClient,
  getGa4Property,
  GoogleApiConfigError,
} from "./google-clients";

const ORGANIC = "Organic Search";

export type OrganicFunnel = {
  organicSessions: number;
  pricingSessions: number;
  signups: number;
  proActivations: number;
};

export type FunnelStage = {
  label: string;
  count: number;
  /** Conversión vs la etapa previa (0..1). `null` en el tope del embudo. */
  pctFromPrev: number | null;
  /** Conversión vs el tope del embudo (0..1). */
  pctFromTop: number;
};

/** Filtro "canal = Organic Search" reutilizable. */
function organicExpr() {
  return {
    filter: {
      fieldName: "sessionDefaultChannelGroup",
      stringFilter: { matchType: "EXACT" as const, value: ORGANIC },
    },
  };
}

function num(v: string | null | undefined): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * El embudo orgánico de los últimos `days` días. Tres reports en paralelo:
 * sesiones, page views de /pricing, y los dos eventos del funnel.
 */
export const getOrganicFunnel = cache(
  async (days = 28): Promise<OrganicFunnel> => {
    const client = getAnalyticsDataClient();
    const property = getGa4Property();
    const dateRanges = [{ startDate: `${days}daysAgo`, endDate: "yesterday" }];

    const [sessionsRes, pricingRes, eventsRes] = await Promise.all([
      // 1) Sesiones orgánicas
      client.properties.runReport({
        property,
        requestBody: {
          dateRanges,
          metrics: [{ name: "sessions" }],
          dimensionFilter: organicExpr(),
        },
      }),
      // 2) Sesiones orgánicas que vieron /pricing (cualquier locale).
      //    `sessions` (no screenPageViews) para que la etapa no se infle con
      //    reloads/revisitas y nunca supere el tope (evita conversiones >100%).
      //    ENDS_WITH captura /pricing + /en/pricing + /it/pricing + /pt/pricing.
      client.properties.runReport({
        property,
        requestBody: {
          dateRanges,
          metrics: [{ name: "sessions" }],
          dimensionFilter: {
            andGroup: {
              expressions: [
                organicExpr(),
                {
                  filter: {
                    fieldName: "pagePath",
                    stringFilter: { matchType: "ENDS_WITH" as const, value: "/pricing" },
                  },
                },
              ],
            },
          },
        },
      }),
      // 3) Eventos del funnel (sign_up + pro_activation) orgánicos, en un report
      client.properties.runReport({
        property,
        requestBody: {
          dateRanges,
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: {
            andGroup: {
              expressions: [
                organicExpr(),
                {
                  filter: {
                    fieldName: "eventName",
                    inListFilter: { values: ["sign_up", "pro_activation"] },
                  },
                },
              ],
            },
          },
        },
      }),
    ]);

    let signups = 0;
    let proActivations = 0;
    for (const row of eventsRes.data.rows ?? []) {
      const name = row.dimensionValues?.[0]?.value;
      const count = num(row.metricValues?.[0]?.value);
      if (name === "sign_up") signups = count;
      else if (name === "pro_activation") proActivations = count;
    }

    return {
      organicSessions: num(sessionsRes.data.rows?.[0]?.metricValues?.[0]?.value),
      pricingSessions: num(pricingRes.data.rows?.[0]?.metricValues?.[0]?.value),
      signups,
      proActivations,
    };
  },
  ["ga4-organic-funnel"],
  { revalidate: 3600, tags: ["ga4"] },
);

/** Convierte el embudo crudo en etapas con % vs previa + % vs tope. */
export function deriveFunnelStages(raw: OrganicFunnel): FunnelStage[] {
  const ordered = [
    { label: "Sesiones orgánicas", count: raw.organicSessions },
    { label: "Vieron /pricing", count: raw.pricingSessions },
    { label: "Signups", count: raw.signups },
    { label: "Activaciones Pro", count: raw.proActivations },
  ];
  const top = ordered[0]?.count ?? 0;
  return ordered.map((s, i) => {
    const prev = i === 0 ? null : ordered[i - 1].count;
    return {
      label: s.label,
      count: s.count,
      pctFromPrev: prev === null ? null : prev > 0 ? s.count / prev : 0,
      pctFromTop: top > 0 ? s.count / top : 0,
    };
  });
}

/**
 * Envuelve una query GA4 y devuelve `{ ok, data, error }` — espejo de
 * `safeGsc`. Los errores de config (env var faltante) salen como `ok:false`
 * con el mensaje, que la page muestra en el banner.
 */
export async function safeGa4<T>(
  fn: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof GoogleApiConfigError) {
      return { ok: false, error: err.message };
    }
    const msg =
      err instanceof Error ? err.message : "Error desconocido al consultar GA4";
    console.error("[ga4-queries] error:", err);
    return { ok: false, error: msg };
  }
}
