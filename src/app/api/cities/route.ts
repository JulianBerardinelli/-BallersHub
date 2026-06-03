// GET /api/cities?country=AR&q=cordoba&limit=20
//
// Cascading country→city source for the team location picker (scouting Phase 2).
// Backed by `country-state-city` server-side so the ~30MB dataset never ships
// to the browser — the client combobox queries this endpoint on demand. Returns
// only cities that carry coordinates (those are what feed the globe pins).
//
// Auth-gated to any logged-in user (managers propose teams, admins edit them);
// the data itself is public reference data, but gating keeps it from being an
// open scraping proxy.

import { NextResponse } from "next/server";
import { City, State } from "country-state-city";

import { createSupabaseServerRoute } from "@/lib/supabase/server";

export const runtime = "nodejs";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export type CityResult = {
  name: string;
  state: string | null;
  latitude: number;
  longitude: number;
};

export async function GET(req: Request) {
  const supa = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const country = (url.searchParams.get("country") ?? "").toUpperCase().slice(0, 2);
  const q = normalize(url.searchParams.get("q") ?? "");
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));

  if (!/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json(
      { error: "Parámetro 'country' (ISO-2) requerido." },
      { status: 400 },
    );
  }

  const cities = City.getCitiesOfCountry(country) ?? [];
  const stateName = new Map(
    (State.getStatesOfCountry(country) ?? []).map((s) => [s.isoCode, s.name]),
  );

  // Only cities with real coordinates are useful for the globe.
  const withCoords = cities.filter((c) => c.latitude && c.longitude);

  let ranked = withCoords;
  if (q) {
    ranked = withCoords
      .filter((c) => normalize(c.name).includes(q))
      .sort((a, b) => {
        const an = normalize(a.name);
        const bn = normalize(b.name);
        const aw = an.startsWith(q) ? 0 : 1;
        const bw = bn.startsWith(q) ? 0 : 1;
        if (aw !== bw) return aw - bw;
        return an.localeCompare(bn, "es");
      });
  } else {
    ranked = [...withCoords].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  const out: CityResult[] = ranked.slice(0, limit).map((c) => ({
    name: c.name,
    state: c.stateCode ? stateName.get(c.stateCode) ?? null : null,
    latitude: Number(c.latitude),
    longitude: Number(c.longitude),
  }));

  return NextResponse.json({ cities: out });
}
