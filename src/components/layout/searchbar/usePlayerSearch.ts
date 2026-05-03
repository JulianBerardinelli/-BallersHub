// src/components/layout/searchbar/usePlayerSearch.ts
"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase/client";

export type PlayerHit = {
  kind: "player";
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

export type AgencyHit = {
  kind: "agency";
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  headquarters: string | null;
  operativeCountries: string[] | null;
  services: string[] | null;
};

export type ManagerHit = {
  kind: "manager";
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  contactEmail: string | null;
  agencyName: string | null;
  agencySlug: string | null;
};

export type SearchHit = PlayerHit | AgencyHit | ManagerHit;

export type SearchResults = {
  players: PlayerHit[];
  agencies: AgencyHit[];
  managers: ManagerHit[];
};

type PlayerRow = {
  id: string;
  slug: string;
  full_name: string;
  current_club: string | null;
  current_team_id: string | null;
  positions: string[] | null;
  avatar_url: string | null;
  market_value_eur: number | null;
  plan_public: "free" | "pro" | "pro_plus" | null;
  team: {
    name: string | null;
    slug: string | null;
    crest_url: string | null;
    updated_at: string | null;
  } | null;
};

type AgencyRow = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  headquarters: string | null;
  operative_countries: string[] | null;
  services: string[] | null;
};

type ManagerRow = {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  contact_email: string | null;
};

type UserAgencyRow = {
  id: string;
  agency_id: string | null;
};

type AgencyMiniRow = {
  id: string;
  slug: string;
  name: string;
};

const EMPTY: SearchResults = { players: [], agencies: [], managers: [] };

export function usePlayerSearch(q: string) {
  const [results, setResults] = React.useState<SearchResults>(EMPTY);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    async function run() {
      const query = q.trim();
      if (!query) {
        setResults(EMPTY);
        return;
      }
      setLoading(true);

      const ilike = `%${query}%`;

      const [playersRes, agenciesRes, managersRes] = await Promise.all([
        supabase
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
          .ilike("full_name", ilike)
          .limit(15),
        supabase
          .from("agency_profiles")
          .select("id, slug, name, logo_url, headquarters, operative_countries, services")
          .eq("is_approved", true)
          .ilike("name", ilike)
          .limit(10),
        supabase
          .from("manager_profiles")
          .select("id, user_id, full_name, avatar_url, contact_email")
          .ilike("full_name", ilike)
          .limit(10),
      ]);

      if (!active) return;

      if (playersRes.error) console.error(playersRes.error);
      if (agenciesRes.error) console.error(agenciesRes.error);
      if (managersRes.error) console.error(managersRes.error);

      const playerRows = (playersRes.data ?? []) as unknown as PlayerRow[];
      const players: PlayerHit[] = playerRows.map((r) => ({
        kind: "player",
        id: r.id,
        slug: r.slug,
        name: r.full_name,
        club: r.team?.name ?? r.current_club ?? null,
        clubSlug: r.team?.slug ?? null,
        clubCrestUrl: r.team?.crest_url ?? null,
        positions: r.positions ?? null,
        avatarUrl: r.avatar_url ?? null,
        marketValueEur: r.market_value_eur ?? null,
        plan: (r.plan_public ?? "free") as PlayerHit["plan"],
      }));

      const agencyRows = (agenciesRes.data ?? []) as unknown as AgencyRow[];
      const agencies: AgencyHit[] = agencyRows.map((r) => ({
        kind: "agency",
        id: r.id,
        slug: r.slug,
        name: r.name,
        logoUrl: r.logo_url ?? null,
        headquarters: r.headquarters ?? null,
        operativeCountries: r.operative_countries ?? null,
        services: r.services ?? null,
      }));

      const managerRows = (managersRes.data ?? []) as unknown as ManagerRow[];

      // Resolve manager → agency through user_profiles in two cheap follow-up queries.
      let managers: ManagerHit[] = managerRows.map((r) => ({
        kind: "manager",
        id: r.id,
        userId: r.user_id,
        name: r.full_name,
        avatarUrl: r.avatar_url ?? null,
        contactEmail: r.contact_email ?? null,
        agencyName: null,
        agencySlug: null,
      }));

      if (managers.length > 0) {
        const userIds = managers.map((m) => m.userId);
        const { data: usersData } = await supabase
          .from("user_profiles")
          .select("id, agency_id")
          .in("id", userIds);
        const userRows = (usersData ?? []) as unknown as UserAgencyRow[];
        const agencyIds = Array.from(
          new Set(userRows.map((u) => u.agency_id).filter((v): v is string => !!v))
        );

        let agencyMap = new Map<string, AgencyMiniRow>();
        if (agencyIds.length > 0) {
          const { data: agData } = await supabase
            .from("agency_profiles")
            .select("id, slug, name")
            .in("id", agencyIds);
          const agRows = (agData ?? []) as unknown as AgencyMiniRow[];
          agencyMap = new Map(agRows.map((a) => [a.id, a]));
        }

        const userToAgency = new Map(userRows.map((u) => [u.id, u.agency_id]));
        managers = managers.map((m) => {
          const aid = userToAgency.get(m.userId) ?? null;
          const ag = aid ? agencyMap.get(aid) : null;
          return {
            ...m,
            agencyName: ag?.name ?? null,
            agencySlug: ag?.slug ?? null,
          };
        });
      }

      if (!active) return;
      setResults({ players, agencies, managers });
      setLoading(false);
    }

    const t = setTimeout(run, 180);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  return { results, loading };
}
