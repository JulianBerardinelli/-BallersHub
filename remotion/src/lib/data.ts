/**
 * Modelo de datos del reel + fuente de datos.
 *
 * `ReelData` es un shape PLANO y serializable que mapea 1:1 a lo que ya vive
 * en tu DB (tabla `player_profiles` + `career_items` + `stats_seasons` +
 * `teams`/`divisions`, ver `src/app/(public)/[slug]/page.tsx`).
 *
 * Hoy `getReelData()` devuelve un MOCK realista para que Studio levante sin
 * depender de la DB ni de env vars. Cuando exista el endpoint público
 * `/api/portfolio/[slug]/reel` en la app Next, seteá la base y el reel pasa a
 * ser data-driven real sin tocar el componente:
 *
 *   REMOTION_REEL_API_BASE=https://tu-dominio npx remotion render PortfolioReel --props='{"slug":"messi"}'
 */

export type ReelCareerStop = {
  club: string;
  startYear: number | null;
  endYear: number | null;
  crestUrl: string | null;
};

export type ReelData = {
  slug: string;
  fullName: string;
  positions: string[]; // ej: ["Mediocampista"]
  currentClub: string | null;
  avatarUrl: string | null; // foto del hero; null => placeholder con iniciales
  nationality: string[]; // ej: ["Argentina"]
  age: number | null;
  heightCm: number | null;
  /** Suma de stats_seasons a lo largo de la carrera. */
  totals: { matches: number; goals: number; assists: number };
  /** Trayectoria (clubs), más reciente primero. */
  career: ReelCareerStop[];
};

/** Datos de ejemplo con el shape EXACTO de la DB — para diseñar en Studio. */
export const MOCK_REEL: ReelData = {
  slug: "julian-berardinelli",
  fullName: "Julián Berardinelli",
  positions: ["Mediocampista"],
  currentClub: "Boca Juniors",
  avatarUrl: null,
  nationality: ["Argentina"],
  age: 23,
  heightCm: 178,
  totals: { matches: 142, goals: 28, assists: 35 },
  career: [
    { club: "Boca Juniors", startYear: 2023, endYear: null, crestUrl: null },
    { club: "Defensa y Justicia", startYear: 2021, endYear: 2023, crestUrl: null },
    { club: "Club Atlético Tigre", startYear: 2019, endYear: 2021, crestUrl: null },
  ],
};

/**
 * Trae los datos del reel para un slug.
 * - Sin `REMOTION_REEL_API_BASE` (default): devuelve el mock (con el slug pedido).
 * - Con base seteada: hace fetch al endpoint público y espera un `ReelData`.
 */
export async function getReelData(
  slug: string,
  signal?: AbortSignal,
): Promise<ReelData> {
  const base =
    typeof process !== "undefined"
      ? process.env.REMOTION_REEL_API_BASE || process.env.REEL_API_BASE || null
      : null;

  if (!base) {
    return { ...MOCK_REEL, slug };
  }

  const res = await fetch(
    `${base.replace(/\/$/, "")}/api/portfolio/${encodeURIComponent(slug)}/reel`,
    { signal },
  );
  if (!res.ok) {
    throw new Error(`Reel API respondió ${res.status} para "${slug}"`);
  }
  return (await res.json()) as ReelData;
}
