// Generate a SQL backfill script for teams.city / latitude / longitude
// (scouting Phase 2), to be reviewed and run in the Supabase SQL editor.
//
// READ-ONLY against the DB: it only SELECTs the teams and resolves each club's
// city offline, then writes `*.sql` with UPDATE-by-id statements. It NEVER
// writes to the database — the owner applies the reviewed SQL themselves.
//
// Resolution (same as scripts/backfill-team-cities.ts, conservative):
//   overrides → match against country-state-city's cities (cleaning club
//   prefixes/suffixes) → Nominatim with a confidence gate (only trust a result
//   whose city is consistent with the club name). Unresolved clubs are listed
//   as comments for manual fill via the admin CityPicker.
//
// Usage (point --env at the env file with the TARGET DATABASE_URL):
//   npx tsx scripts/gen-team-cities-sql.ts --env /abs/path/.env.local.bak.prod
//   npx tsx scripts/gen-team-cities-sql.ts            # defaults to .env.local
//   → writes scripts/out/backfill-team-cities.sql

import { config } from "dotenv";

const envIdx = process.argv.indexOf("--env");
const envPath = envIdx >= 0 ? process.argv[envIdx + 1] : ".env.local";
config({ path: envPath });

import { writeFileSync, mkdirSync } from "fs";
import postgres from "postgres";
import { City } from "country-state-city";
import { KNOWN_CLUB_CITIES, type ClubCity } from "./data/known-club-cities";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
const sqlEsc = (s: string) => s.replace(/'/g, "''");

type Geo = { city: string; lat: number; lon: number; source: string };

// Curated club → city map (hand-verified), normalized for lookup.
const CURATED = new Map<string, ClubCity>(
  Object.entries(KNOWN_CLUB_CITIES).map(([name, loc]) => [normalize(name), loc]),
);

const LEADING =
  /^(cd|ad|cf|fc|ca|ac|as|sd|sad|cp|rc|ud|ue|se|sl|ssc|rb|club|deportivo|deportiva|sporting|racing|atletico|union|inter|real)\s+/i;
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

const cityCache = new Map<string, { name: string; norm: string; lat: number; lon: number }[]>();
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

/**
 * Resolve a club to a city — conservatively, and offline. Curated map first
 * (covers clubs not named after their city), then an EXACT country-state-city
 * name match (clubs literally named after a city). NO fuzzy substring match and
 * NO geocoding guesses: a club pinned to the wrong city is worse than one left
 * empty, and the unresolved ones fill in via the admin CityPicker.
 */
function resolveCity(name: string, cc: string): Geo | null {
  const curated = CURATED.get(normalize(name));
  if (curated) {
    return { city: curated.city, lat: curated.lat, lon: curated.lon, source: "curado" };
  }
  const clean = normalize(cleanClubName(name));
  if (clean.length >= 3) {
    const exact = citiesFor(cc).find((c) => c.norm === clean);
    if (exact) {
      return { city: exact.name, lat: exact.lat, lon: exact.lon, source: "csc-exacto" };
    }
  }
  return null;
}

type TeamRow = {
  id: string;
  name: string;
  country: string | null;
  country_code: string | null;
  latitude: number | null;
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(`✗ DATABASE_URL no definido en ${envPath}`);
    process.exit(1);
  }
  const ref = (url.match(/[a-z]{20}/) ?? [])[0] ?? "?";
  console.log(`🔌 Leyendo (READ-ONLY) de project ref: ${ref}\n`);

  const sql = postgres(url, { max: 1, prepare: false });
  const rows = (await sql`
    select id, name, country, country_code, latitude
    from public.teams
    where latitude is null and country_code is not null
    order by name
  `) as unknown as TeamRow[];

  console.log(`${rows.length} equipo(s) sin coords. Resolviendo…\n`);

  const updates: { t: TeamRow; geo: Geo }[] = [];
  const unresolved: TeamRow[] = [];

  for (const t of rows) {
    const geo = resolveCity(t.name, t.country_code ?? "");
    if (geo) {
      updates.push({ t, geo });
      console.log(`  ✓ ${t.name.padEnd(30)} → ${geo.city} [${geo.source}]`);
    } else {
      unresolved.push(t);
      console.log(`  ✗ ${t.name.padEnd(30)} → sin resolver`);
    }
  }

  const stamp = new Date().toISOString();
  let out = `-- Backfill team cities (scouting Fase 2) — project ${ref}\n`;
  out += `-- Generado ${stamp} por scripts/gen-team-cities-sql.ts (READ-ONLY).\n`;
  out += `-- Revisá y corré en el SQL editor de Supabase. UPDATE por id, atómico.\n`;
  out += `-- Resueltos: ${updates.length}. Sin resolver: ${unresolved.length}.\n\n`;
  out += `begin;\n\n`;
  for (const { t, geo } of updates) {
    out += `update public.teams set city='${sqlEsc(geo.city)}', latitude=${geo.lat}, longitude=${geo.lon}, updated_at=now() where id='${t.id}'; -- ${t.name} [${geo.source}]\n`;
  }
  out += `\ncommit;\n`;
  if (unresolved.length) {
    out += `\n-- SIN RESOLVER (${unresolved.length}) — completar a mano con el CityPicker en /admin/teams:\n`;
    for (const t of unresolved) out += `--   · ${t.name} (${t.country_code})\n`;
  }

  mkdirSync("scripts/out", { recursive: true });
  const file = "scripts/out/backfill-team-cities.sql";
  writeFileSync(file, out);

  console.log(`\n✅ ${updates.length} UPDATEs, ${unresolved.length} sin resolver.`);
  console.log(`📄 SQL escrito en ${file}\n`);

  await sql.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
