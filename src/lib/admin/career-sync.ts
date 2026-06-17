// Live full-replace of a player's career_items, used by the admin trajectory
// CRUD (bypassing the revision queue). Combines:
//   - division resolution from submitCareerRevision (upsert "new:" divisions)
//   - proposed-team resolution from the career-approve route (find-or-create
//     a teams row immediately, since the admin writes live)
//   - the diff/insert/update/delete + current-stage recompute from the route
//
// Operates with a service-role client. Returns a structured result so callers
// surface a message instead of throwing.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureUniqueTeamSlug, findExistingTeamIdByName, slugify } from "@/lib/admin/teams";
import type { CareerStageInput } from "@/app/[locale]/(dashboard)/dashboard/edit-profile/football-data/schemas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, any, any>;

type SyncResult = { ok: true } | { ok: false; error: string };

function toStartDate(year: number | null | undefined): string | null {
  if (!year) return null;
  return `${year}-01-01`;
}

function toEndDate(year: number | null | undefined): string | null {
  if (!year) return null;
  return `${year}-12-31`;
}

/**
 * Replace the player's `career_items` with `stages` (admin live edit).
 *
 * @param actorUserId  recorded as teams.requested_by_user_id for any new team.
 */
export async function syncPlayerCareerLive(
  admin: AdminClient,
  playerId: string,
  stages: CareerStageInput[],
  actorUserId: string,
): Promise<SyncResult> {
  // Resolve a "new:<name>|<cc>" division id into a real divisions.id (upsert
  // pending), mirroring submitCareerRevision. Real uuids / null pass through.
  const resolveDivisionId = async (
    rawId: string | null,
    rawName: string | null,
    fallbackCountryCode: string | null,
  ): Promise<string | null> => {
    if (!rawId) return null;
    if (!rawId.startsWith("new:")) return rawId;

    const parts = rawId.replace("new:", "").split("|");
    const tmpDivName = parts[0] || rawName || "";
    if (!tmpDivName) return null;
    const tmpCountryCode = parts[1] || fallbackCountryCode || "";
    const slug =
      tmpDivName.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + tmpCountryCode.toLowerCase();

    const { data: divRow, error: divErr } = await admin
      .from("divisions")
      .upsert(
        { name: tmpDivName, country_code: tmpCountryCode.toUpperCase(), slug, status: "pending" },
        { onConflict: "slug" },
      )
      .select("id")
      .maybeSingle<{ id: string }>();

    if (divErr || !divRow) return null;
    return divRow.id;
  };

  const { data: existingRows, error: existingErr } = await admin
    .from("career_items")
    .select("id")
    .eq("player_id", playerId);

  if (existingErr) return { ok: false, error: existingErr.message };

  const keptIds = new Set<string>();
  const proposedTeamCache = new Map<string, string | null>();
  const resolved: Array<{ club: string; teamId: string | null; endYear: number | null }> = [];

  for (const stage of stages) {
    let resolvedTeamId = stage.teamId ?? null;

    // Proposed (not-in-catalog) team → find-or-create a real teams row now.
    if (!resolvedTeamId && stage.proposedTeam) {
      const cacheKey = `${stage.proposedTeam.name}|${stage.proposedTeam.countryCode}`;
      if (proposedTeamCache.has(cacheKey)) {
        resolvedTeamId = proposedTeamCache.get(cacheKey) ?? null;
      } else {
        const displayName = (stage.proposedTeam.name || stage.club || "").trim();
        if (displayName) {
          let teamId = await findExistingTeamIdByName(displayName, admin);
          if (!teamId) {
            const slug = await ensureUniqueTeamSlug(slugify(displayName), admin);
            const insertRes = await admin
              .from("teams")
              .insert({
                name: displayName,
                slug,
                country: stage.proposedTeam.countryName ?? null,
                country_code: stage.proposedTeam.countryCode ?? null,
                category: stage.division ?? null,
                transfermarkt_url: stage.proposedTeam.transfermarktUrl ?? null,
                status: "pending",
                visibility: "public",
                requested_by_user_id: actorUserId,
              })
              .select("id")
              .single<{ id: string }>();
            if (insertRes.error) return { ok: false, error: insertRes.error.message };
            teamId = insertRes.data.id;
          }
          resolvedTeamId = teamId;
        }
        proposedTeamCache.set(cacheKey, resolvedTeamId);
      }
    }

    const fallbackCc = stage.proposedTeam?.countryCode ?? null;
    const divisionId = await resolveDivisionId(stage.divisionId ?? null, stage.division ?? null, fallbackCc);
    const secondaryDivisionId = await resolveDivisionId(
      stage.secondaryDivisionId ?? null,
      stage.secondaryDivision ?? null,
      fallbackCc,
    );

    const payload = {
      club: stage.club,
      division: stage.division ?? null,
      division_id: divisionId,
      secondary_division: stage.secondaryDivision ?? null,
      secondary_division_id: secondaryDivisionId,
      start_date: toStartDate(stage.startYear),
      end_date: toEndDate(stage.endYear),
      team_id: resolvedTeamId,
      updated_at: new Date().toISOString(),
    };

    if (stage.originalId) {
      keptIds.add(stage.originalId);
      const { error } = await admin
        .from("career_items")
        .update(payload)
        .eq("id", stage.originalId)
        .eq("player_id", playerId);
      if (error) return { ok: false, error: error.message };
    } else {
      const insertRes = await admin
        .from("career_items")
        .insert({
          player_id: playerId,
          club: payload.club,
          division: payload.division,
          division_id: payload.division_id,
          secondary_division: payload.secondary_division,
          secondary_division_id: payload.secondary_division_id,
          start_date: payload.start_date,
          end_date: payload.end_date,
          team_id: payload.team_id,
        })
        .select("id")
        .single<{ id: string }>();
      if (insertRes.error) return { ok: false, error: insertRes.error.message };
      keptIds.add(insertRes.data.id);
    }

    resolved.push({ club: stage.club, teamId: resolvedTeamId, endYear: stage.endYear ?? null });
  }

  // Delete career rows the admin removed from the editor.
  const existingIds = (existingRows ?? []).map((row) => row.id as string);
  const toDelete = existingIds.filter((cid) => !keptIds.has(cid));
  if (toDelete.length > 0) {
    const { error } = await admin.from("career_items").delete().in("id", toDelete);
    if (error) return { ok: false, error: error.message };
  }

  // Recompute current_team_id / current_club from the open (no end year) stage.
  const currentStage = resolved.find((r) => r.endYear === null) ?? null;
  await admin
    .from("player_profiles")
    .update({
      current_team_id: currentStage?.teamId ?? null,
      current_club: currentStage?.club ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", playerId);

  return { ok: true };
}
