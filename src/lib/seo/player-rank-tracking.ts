// KPI primario: "Pro players winning their own name SERP".
//
// Por cada Pro player aprobado y público, query GSC por SU NOMBRE EXACTO
// como search query y devolvemos:
//   - position promedio de los últimos 28 días (1 = top, lower es mejor)
//   - impressions / clicks
//   - estado: "winning" si position <= 3, "fighting" si <= 10, "missing" si nada
//
// Definición de "win":
//   - position <= 3 → el portfolio aparece en el top 3 cuando alguien
//     busca su nombre. Es el objetivo del plan (ver seo-strategy.md §2).
//   - position 4-10 → primera página de Google. Sigue siendo bueno.
//   - position > 10 / sin data → todavía no aparece o tiene poca impresión.
//
// Performance:
//   - 1 query a GSC por player. Con ≤ 200 Pro players estamos lejos de la
//     quota (1.200 queries/min, 50.000/día). En el futuro, si crecemos a
//     miles, optimizamos con dimensionFilter regex.

import { unstable_cache as cache } from "next/cache";
import { db } from "@/lib/db";
import { playerProfiles, subscriptions } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getMetricsForQuery } from "./gsc-queries";

export type PlayerRankRow = {
  userId: string;
  slug: string;
  fullName: string;
  query: string; // la query que disparamos a GSC
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  status: "winning" | "fighting" | "missing";
  hasData: boolean;
};

/**
 * Lista los Pro players aprobados y públicos. Mismo predicate que
 * sitemap.ts (`plan IN ('pro','pro_plus') AND status_v2 IN ('trialing','active')`).
 */
async function listProPlayers(): Promise<
  Array<{ userId: string; slug: string; fullName: string }>
> {
  const players = await db
    .select({
      userId: playerProfiles.userId,
      slug: playerProfiles.slug,
      fullName: playerProfiles.fullName,
    })
    .from(playerProfiles)
    .where(
      and(
        eq(playerProfiles.status, "approved"),
        eq(playerProfiles.visibility, "public"),
      ),
    );

  if (players.length === 0) return [];

  const userIds = players.map((p) => p.userId);
  const subs = await db
    .select({
      userId: subscriptions.userId,
      plan: subscriptions.plan,
      statusV2: subscriptions.statusV2,
    })
    .from(subscriptions)
    .where(inArray(subscriptions.userId, userIds));

  const proSet = new Set(
    subs
      .filter(
        (s) =>
          (s.plan === "pro" || s.plan === "pro_plus") &&
          (s.statusV2 === "trialing" || s.statusV2 === "active"),
      )
      .map((s) => s.userId),
  );

  return players
    .filter((p) => proSet.has(p.userId) && p.slug && p.fullName)
    .map((p) => ({
      userId: p.userId,
      slug: p.slug!,
      fullName: p.fullName!,
    }));
}

function classify(position: number, impressions: number): PlayerRankRow["status"] {
  if (impressions === 0) return "missing";
  if (position <= 3) return "winning";
  if (position <= 10) return "fighting";
  return "missing";
}

/**
 * KPI primario: tabla de Pro players con su rank por own-name query.
 * Cacheado 1h. La UI muestra estado vacío si la lista está vacía
 * (sin Pro players todavía) o si hay error de config GSC.
 */
export const getProPlayersRankTable = cache(
  async (days = 28): Promise<PlayerRankRow[]> => {
    const players = await listProPlayers();
    if (players.length === 0) return [];

    // Query GSC por cada player en paralelo. Promise.allSettled para que
    // un fallo en uno no rompa la tabla entera.
    const results = await Promise.allSettled(
      players.map(async (p) => {
        const metrics = await getMetricsForQuery(p.fullName, days);
        return { player: p, metrics };
      }),
    );

    return results
      .map((r): PlayerRankRow | null => {
        if (r.status !== "fulfilled") return null;
        const { player, metrics } = r.value;
        const has = metrics != null;
        return {
          userId: player.userId,
          slug: player.slug,
          fullName: player.fullName,
          query: player.fullName,
          clicks: metrics?.clicks ?? 0,
          impressions: metrics?.impressions ?? 0,
          ctr: metrics?.ctr ?? 0,
          position: metrics?.position ?? 0,
          status: classify(metrics?.position ?? 0, metrics?.impressions ?? 0),
          hasData: has,
        };
      })
      .filter((r): r is PlayerRankRow => r != null)
      .sort((a, b) => {
        // Ordenar: winning primero, después fighting, después missing.
        const order = { winning: 0, fighting: 1, missing: 2 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        // Dentro de cada bucket, los que tienen mejor position (lower) primero.
        if (a.hasData && b.hasData) return a.position - b.position;
        return 0;
      });
  },
  ["gsc-player-rank-table"],
  { revalidate: 3600, tags: ["gsc"] },
);

/**
 * Summary numérico para mostrar arriba del overview:
 *  { total: N, winning: X, fighting: Y, missing: Z }
 */
export function summarizePlayerRanks(rows: PlayerRankRow[]): {
  total: number;
  winning: number;
  fighting: number;
  missing: number;
  winRate: number; // % winning sobre total
} {
  const winning = rows.filter((r) => r.status === "winning").length;
  const fighting = rows.filter((r) => r.status === "fighting").length;
  const missing = rows.filter((r) => r.status === "missing").length;
  const total = rows.length;
  return {
    total,
    winning,
    fighting,
    missing,
    winRate: total === 0 ? 0 : winning / total,
  };
}
