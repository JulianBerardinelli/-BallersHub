// src/components/layout/searchbar/usePlayerSearch.ts
"use client";

import * as React from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export type PlayerHit = {
  id: string;
  slug: string;
  name: string;
  club: string | null;
  clubSlug: string | null;
  clubCrestUrl: string | null;
  positions: string[] | null;
  avatarUrl: string | null;
  marketValueEur: number | null;
  plan: "free" | "pro" | "pro_plus";
};

type Row = {
  id: string;
  slug: string;
  full_name: string;
  current_club: string | null;
  current_team_id: string | null;
  positions: string[] | null;
  avatar_url: string | null;
  market_value_eur: number | null;
  plan_public: "free" | "pro" | "pro_plus" | null;
  // relación por FK player_profiles.current_team_id -> teams.id
  team: {
    name: string | null;
    slug: string | null;
    crest_url: string | null;
    updated_at: string | null;
  } | null;
};

export function usePlayerSearch(q: string) {
  const supabase = React.useMemo(() => createClientComponentClient(), []);
  const [results, setResults] = React.useState<PlayerHit[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    async function run() {
      const query = q.trim();
      if (!query) {
        setResults([]);
        return;
      }
      setLoading(true);

      const { data, error } = await supabase
        .from("player_profiles")
        .select(`
          id,
          slug,
          full_name,
          current_club,
          current_team_id,
          positions,
          avatar_url,
          market_value_eur,
          plan_public,
          team:teams!player_profiles_current_team_id_fkey (
            name,
            slug,
            crest_url,
            updated_at
          )
        `)
        .eq("visibility", "public")
        .ilike("full_name", `%${query}%`)
        .limit(20);

      if (!active) return;

      if (error) {
        console.error(error);
        setResults([]);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as Row[];

      const mapped: PlayerHit[] = rows.map((r) => {
        // preferimos datos del team aprobado si están disponibles
        const clubName = r.team?.name ?? r.current_club ?? null;
        const crestUrl = r.team?.crest_url ?? null;
        const clubSlug = r.team?.slug ?? null;

        return {
          id: r.id,
          slug: r.slug,
          name: r.full_name,
          club: clubName,
          clubSlug,
          clubCrestUrl: crestUrl,
          positions: r.positions ?? null,
          avatarUrl: r.avatar_url ?? null,
          marketValueEur: r.market_value_eur ?? null,
          plan: (r.plan_public ?? "free") as PlayerHit["plan"],
        };
      });

      if (!active) return;
      setResults(mapped);
      setLoading(false);
    }

    const t = setTimeout(run, 180);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q, supabase]);

  return { results, loading };
}
