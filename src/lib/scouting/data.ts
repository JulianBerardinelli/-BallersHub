// BallersHub /players (Scouting) — server-side data fetch.
//
// Resolves the SAME indexable set the SEO surfaces use (`isPlayerIndexable`),
// then enriches each row with the fields the scouting table needs: club via
// the `teams` relation (crest + country), normalized foot/contract, derived
// age, primary position + group. Returns a browser-safe `ScoutPlayer[]` — no
// Drizzle shapes or heavy columns (bio) leak into the client bundle.
//
// This is the single fetch the `/players` page uses: it feeds BOTH the
// server-rendered crawlable table (SEO, from PR #135) AND the client island.

import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { playerProfiles } from "@/db/schema/players";
import { teams } from "@/db/schema/teams";
// Single source of truth for the Pro predicate — shared with the sitemap and
// the `/players` directory so the three never drift (and so the `plan_id`
// fallback is applied everywhere, not just here).
import {
  isPlayerIndexable,
  resolveProUserIds,
} from "@/lib/seo/indexable-profiles";
import {
  nameInitials,
  normalizeContract,
  normalizeFoot,
  resolveAllPositions,
  resolveNationalityCodes,
} from "./taxonomies";
import type { ScoutPlayer } from "./types";

const DEFAULT_CREST = "/images/team-default";

function computeAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
}

function cleanAvatar(url: string | null): string | null {
  if (!url || url.includes("player-default")) return null;
  return url;
}

function cleanCrest(url: string | null): string | null {
  if (!url || url.includes(DEFAULT_CREST.split("/").pop()!)) return null;
  return url;
}

function toNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Fetch players enriched for the scouting table. Pro-first, then
 * most-recently-updated — strongest profiles surface at the top before the user
 * sorts. Throws are the caller's to handle (the page degrades to an empty
 * island).
 *
 * By default only INDEXABLE profiles are returned (same set as the sitemap +
 * per-page robots), which is what the home-hero globe wants. The `/players`
 * directory passes `includeNonIndexable: true` to ALSO surface Free profiles
 * with a thin bio — they're public, so the directory lists them (no Pro tag).
 * Each row carries `indexable` so the page can keep its JSON-LD on the
 * indexable subset and the SEO surfaces never drift.
 */
export async function getScoutingPlayers(
  opts: { includeNonIndexable?: boolean } = {},
): Promise<ScoutPlayer[]> {
  const rows = await db
    .select({
      id: playerProfiles.id,
      slug: playerProfiles.slug,
      userId: playerProfiles.userId,
      fullName: playerProfiles.fullName,
      birthDate: playerProfiles.birthDate,
      nationalityCodes: playerProfiles.nationalityCodes,
      nationality: playerProfiles.nationality,
      foot: playerProfiles.foot,
      heightCm: playerProfiles.heightCm,
      positions: playerProfiles.positions,
      gender: playerProfiles.gender,
      currentClub: playerProfiles.currentClub,
      contractStatus: playerProfiles.contractStatus,
      marketValueEur: playerProfiles.marketValueEur,
      avatarUrl: playerProfiles.avatarUrl,
      bio: playerProfiles.bio,
      updatedAt: playerProfiles.updatedAt,
      teamName: teams.name,
      teamCountry: teams.country,
      teamCountryCode: teams.countryCode,
      teamCrestUrl: teams.crestUrl,
      teamCity: teams.city,
      teamLat: teams.latitude,
      teamLon: teams.longitude,
    })
    .from(playerProfiles)
    .leftJoin(teams, eq(playerProfiles.currentTeamId, teams.id))
    .where(
      and(
        eq(playerProfiles.status, "approved"),
        eq(playerProfiles.visibility, "public"),
      ),
    );

  if (rows.length === 0) return [];

  const proUserIds = await resolveProUserIds(rows.map((r) => r.userId));

  return rows
    .map((r) => {
      const isPro = proUserIds.has(r.userId);
      return { ...r, isPro, indexable: isPlayerIndexable({ isPro, bio: r.bio }) };
    })
    // Default: indexable-only (matches the sitemap + per-page robots). The
    // `/players` directory opts in to also list Free thin-bio profiles.
    .filter((r) => opts.includeNonIndexable || r.indexable)
    .map<ScoutPlayer>((r) => {
      const allPos = resolveAllPositions(r.positions);
      const pos = allPos[0] ?? { code: "", label: "", group: null };
      const club = r.teamName ?? r.currentClub ?? null;
      // Prefer the structured ISO-2 codes; fall back to deriving them from the
      // legacy Spanish names (profiles approved via onboarding store names in
      // `nationality` and leave `nationality_codes` null).
      const natCodes = resolveNationalityCodes(r.nationalityCodes, r.nationality);
      return {
        id: r.id,
        slug: r.slug,
        name: r.fullName,
        age: computeAge(r.birthDate),
        posCode: pos.code,
        posLabel: pos.label,
        posGroup: pos.group,
        positions: allPos,
        club,
        clubCountryCode: r.teamCountryCode ?? null,
        clubCountry: r.teamCountry ?? null,
        clubCrestUrl: cleanCrest(r.teamCrestUrl),
        nationality: natCodes[0] ?? null,
        nationalities: natCodes,
        contract: normalizeContract(r.contractStatus),
        gender: r.gender ?? "male",
        foot: normalizeFoot(r.foot),
        heightCm: r.heightCm ?? null,
        marketValueEur: toNumber(r.marketValueEur),
        avatarUrl: cleanAvatar(r.avatarUrl),
        isPro: r.isPro,
        indexable: r.indexable,
        initials: nameInitials(r.fullName),
        city: r.teamCity ?? null,
        latitude: toNumber(r.teamLat),
        longitude: toNumber(r.teamLon),
        // Carry updatedAt only for the default ordering below.
        _updatedAt: r.updatedAt,
      } as ScoutPlayer & { _updatedAt: Date };
    })
    .sort((a, b) => {
      const aa = a as ScoutPlayer & { _updatedAt: Date };
      const bb = b as ScoutPlayer & { _updatedAt: Date };
      if (a.isPro !== b.isPro) return a.isPro ? -1 : 1;
      return bb._updatedAt.getTime() - aa._updatedAt.getTime();
    })
    .map((p) => {
      // Drop the private ordering field before it crosses to the client.
      const { _updatedAt, ...rest } = p as ScoutPlayer & { _updatedAt: Date };
      void _updatedAt;
      return rest;
    });
}
