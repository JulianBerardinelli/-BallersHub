// src/components/layout/searchbar/usePlayerSearch.ts
"use client";

import * as React from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export type PlayerHit = {
  id: string;
  slug: string;
  name: string;
  club: string | null;    
  positions: string[] | null;
  avatarUrl: string | null;
  marketValueEur: number | null;
  plan: "free" | "pro" | "pro_plus";
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

      // 1) Traer jugadores
      const { data, error } = await supabase
        .from("player_profiles")
        .select(`
          id,
          slug,
          full_name,
          current_club,
          positions,
          avatar_url,
          market_value_eur,
          plan_public
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

      const rows = data ?? [];


      const mapped: PlayerHit[] = rows.map((r: any) => {
        return {
          id: r.id,
          slug: r.slug,
          name: r.full_name,
          club: r.current_club ?? null,
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
    return () => { active = false; clearTimeout(t); };
  }, [q, supabase]);

  return { results, loading };
}
