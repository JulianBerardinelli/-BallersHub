// Backfill team city + coordinates (scouting Phase 2).
//
// Populates `teams.city / latitude / longitude` for teams that don't have a
// location yet, so the scouting globe can plot a pin for each club.
//
// Resolution order per team:
//   1. Curated OVERRIDES (exact, for clubs we already know).
//   2. OpenStreetMap / Nominatim geocoding of "{name}, {country}" (free,
//      rate-limited to 1 req/s per their usage policy).
//   3. Unresolved → left null, reported for manual fill via the admin CityPicker.
//
// Targets whatever DATABASE_URL points at (.env.local) — DEV FIRST, then prod
// with explicit owner authorization, per docs/db/migration-workflow.md. This is
// a DATA migration (UPDATEs), not schema: requires migration 0008 already
// applied to the target DB (the city/lat/lon columns must exist).
//
// Usage:
//   npx tsx scripts/backfill-team-cities.ts            # DRY-RUN (default) — prints a report
//   npx tsx scripts/backfill-team-cities.ts --apply    # writes the resolved rows
//   npx tsx scripts/backfill-team-cities.ts --limit 5  # cap rows (testing)
//
// Review the dry-run report before running with --apply.

import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { City } from "country-state-city";
import * as schema from "../src/db/schema/index.js";

const APPLY = process.argv.includes("--apply");
const LIMIT = (() => {
  const i = process.argv.indexOf("--limit");
  return i >= 0 ? Math.max(1, Number(process.argv[i + 1]) || 0) : Infinity;
})();

/** Exact overrides for clubs we already know — name (normalized) → location. */
const OVERRIDES: Record<string, { city: string; lat: number; lon: number }> = {
  // Examples — extend as needed. Keys are normalize()'d team names.
  "river plate": { city: "Buenos Aires", lat: -34.6037, lon: -58.3816 },
  "boca juniors": { city: "Buenos Aires", lat: -34.6037, lon: -58.3816 },
  "ca platense": { city: "Vicente López", lat: -34.5267, lon: -58.4742 },
  "club atletico platense": { city: "Vicente López", lat: -34.5267, lon: -58.4742 },
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Geo = { city: string | null; lat: number; lon: number; source: string };

// Strip the club affixes that aren't part of the city name, so "Inter Ibiza CD"
// → "Ibiza", "UD San Sebastián" → "San Sebastián", "Real Madrid CF" → "Madrid".
const LEADING =
  /^(cd|cf|fc|ca|ac|as|sd|sad|cp|rc|ud|ue|se|sl|ssc|rb|cd\.|club|deportivo|deportiva|sporting|racing|atletico|union|inter|real)\s+/i;
const TRAILING = /\s+(cd|cf|fc|ca|sd|sad|cp|ue|fs|b|c|ii|iii|sub-?\d+)$/i;

function cleanClubName(name: string): string {
  let n = name.trim();
  for (let i = 0; i < 3; i += 1) {
    const before = n;
    n = n.replace(TRAILING, "").trim();
    n = n.replace(LEADING, "").trim();
    if (n === before) break;
  }
  return n;
}

// country-state-city cities per country, normalized + with coords. Cached.
const cityCache = new Map<
  string,
  { name: string; norm: string; lat: number; lon: number }[]
>();
function citiesFor(cc: string) {
  const key = cc.toUpperCase();
  let list = cityCache.get(key);
  if (!list) {
    list = (City.getCitiesOfCountry(key) ?? [])
      .filter((c) => c.latitude && c.longitude)
      .map((c) => ({
        name: c.name,
        norm: normalize(c.name),
        lat: Number(c.latitude),
        lon: Number(c.longitude),
      }));
    cityCache.set(key, list);
  }
  return list;
}

/** Match a (cleaned) club name to a city in its country via the cities dataset. */
function matchCity(name: string, cc: string): Geo | null {
  const clean = normalize(cleanClubName(name));
  if (clean.length < 3) return null;
  const cities = citiesFor(cc);
  // 1) exact city name
  let best = cities.find((c) => c.norm === clean);
  // 2) a city name appears as a WHOLE WORD/phrase in the cleaned club name
  //    (longest wins). Word boundaries avoid "Moralo" matching "Mora".
  if (!best) {
    best = cities
      .filter((c) => {
        if (c.norm.length < 4) return false;
        const re = new RegExp(
          `\\b${c.norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        );
        return re.test(clean);
      })
      .sort((a, b) => b.norm.length - a.norm.length)[0];
  }
  return best ? { city: best.name, lat: best.lat, lon: best.lon, source: "csc" } : null;
}

async function geocodeNominatim(query: string): Promise<Geo | null> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=" +
    encodeURIComponent(query);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "BallersHub-scouting-backfill/1.0 (team@ballershub.co)",
        "Accept-Language": "es",
      },
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{
      lat: string;
      lon: string;
      address?: Record<string, string>;
    }>;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const r = arr[0];
    const a = r.address ?? {};
    const city =
      a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? null;
    const lat = Number(r.lat);
    const lon = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { city, lat, lon, source: "nominatim" };
  } catch {
    return null;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("✗ DATABASE_URL no definido (revisá .env.local).");
    process.exit(1);
  }
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql, { schema });

  const rows = await db
    .select({
      id: schema.teams.id,
      name: schema.teams.name,
      country: schema.teams.country,
      countryCode: schema.teams.countryCode,
    })
    .from(schema.teams)
    .where(and(isNull(schema.teams.latitude), isNotNull(schema.teams.countryCode)));

  const targets = rows.slice(0, Number.isFinite(LIMIT) ? (LIMIT as number) : rows.length);

  console.log(
    `\n🌍 Backfill team cities — ${APPLY ? "APPLY" : "DRY-RUN"} — ${targets.length} equipo(s) sin coords (de ${rows.length}).\n`,
  );

  let resolved = 0;
  const unresolved: string[] = [];

  for (const t of targets) {
    let geo: Geo | null = null;

    const cc = t.countryCode ?? "";
    const ov = OVERRIDES[normalize(t.name)];
    if (ov) {
      geo = { city: ov.city, lat: ov.lat, lon: ov.lon, source: "override" };
    } else {
      // 1) Try matching the club name to a city in its country (no network).
      geo = matchCity(t.name, cc);
      // 2) Fall back to Nominatim on the cleaned name (rate-limited), but only
      //    TRUST it when the resolved city is consistent with the club name.
      //    Clubs not named after their city (e.g. "CD Manchego") otherwise get
      //    a fuzzy wrong match — better to leave them for manual fill.
      if (!geo) {
        const cleaned = cleanClubName(t.name);
        const nom = await geocodeNominatim(`${cleaned}, ${t.country ?? cc}`);
        await sleep(1100); // Nominatim: max 1 req/s.
        if (nom?.city) {
          const cn = normalize(nom.city);
          const consistent = new RegExp(
            `\\b${cn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          ).test(normalize(cleaned));
          geo = consistent ? nom : null;
        } else {
          geo = null;
        }
      }
    }

    if (!geo) {
      unresolved.push(`${t.name} (${t.countryCode})`);
      console.log(`  ✗ ${t.name.padEnd(28)} ${t.countryCode}  →  UNRESOLVED`);
      continue;
    }

    resolved += 1;
    console.log(
      `  ✓ ${t.name.padEnd(28)} ${t.countryCode}  →  ${(geo.city ?? "?").padEnd(20)} ${geo.lat.toFixed(4)}, ${geo.lon.toFixed(4)}  [${geo.source}]`,
    );

    if (APPLY) {
      await db
        .update(schema.teams)
        .set({
          city: geo.city,
          latitude: geo.lat,
          longitude: geo.lon,
          updatedAt: new Date(),
        })
        .where(eq(schema.teams.id, t.id));
    }
  }

  console.log(
    `\n${APPLY ? "✅ Aplicado" : "🔎 Dry-run"}: ${resolved} resuelto(s), ${unresolved.length} sin resolver.`,
  );
  if (unresolved.length) {
    console.log("   Sin resolver (completar a mano con el CityPicker del admin):");
    for (const u of unresolved) console.log(`     · ${u}`);
  }
  if (!APPLY) {
    console.log("\n   Revisá el reporte y corré de nuevo con --apply para escribir.\n");
  }

  await sql.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
