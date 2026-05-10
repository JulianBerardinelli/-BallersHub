// Server-side tutorial bootstrap. Call from `(dashboard)/dashboard/layout.tsx`
// to compute the full `TutorialState` to pass to the client provider.
//
// Reads (in parallel):
// - profile + agency snapshot needed by step predicates
// - the user's `user_tutorial_progress` row (or null)
//
// Side-effects:
// - Lazily creates a progress row on first visit (so we have a stable
//   timestamp to compare against in re-trigger logic).

import "server-only";
import { db } from "@/lib/db";
import {
  userTutorialProgress,
  playerProfiles,
  playerMedia,
  playerArticles,
  careerItems,
  statsSeasons,
  playerHonours,
  agencyProfiles,
  agencyTeamRelations,
  profileThemeSettings,
  agencyThemeSettings,
  userProfiles,
} from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import type {
  TutorialPlanTier,
  TutorialState,
  TutorialStepId,
} from "./types";
import type { PlanAudience } from "@/lib/dashboard/plan-access";
import {
  resolveStepsForSnapshot,
  type ProfileSnapshot,
} from "./steps";

export type BootstrapInput = {
  userId: string;
  audience: PlanAudience;
  tier: TutorialPlanTier;
};

export async function bootstrapTutorialState(
  input: BootstrapInput,
): Promise<TutorialState | null> {
  // Fetch progress row in parallel with the profile snapshot.
  const [progressRow, snapshot] = await Promise.all([
    db.query.userTutorialProgress.findFirst({
      where: eq(userTutorialProgress.userId, input.userId),
    }),
    buildProfileSnapshot(input),
  ]);

  // Snapshot might be null if the user has no profile yet (e.g. brand new
  // signup that hasn't gone through onboarding). In that case we still
  // show the tutorial (even more reason to guide them) but with all
  // steps in pending state.
  const effectiveSnapshot: ProfileSnapshot =
    snapshot ?? emptySnapshot(input.audience, input.tier);

  const steps = resolveStepsForSnapshot(effectiveSnapshot);
  const completedCount = steps.filter((s) => s.completed).length;
  const total = steps.length;
  const isFullyComplete = completedCount === total && total > 0;
  const currentStepId: TutorialStepId | null =
    steps.find((s) => !s.completed)?.id ?? null;

  // First-time visitor → create the progress row so we can detect re-triggers
  // accurately later. Snapshot the audience+plan so later we can detect
  // upgrades. Non-fatal on failure.
  if (!progressRow) {
    try {
      await db.insert(userTutorialProgress).values({
        userId: input.userId,
        audience: input.audience,
        planAtStart: input.tier,
        lastSeenAt: new Date(),
        completedAt: isFullyComplete ? new Date() : null,
      });
    } catch (err) {
      console.warn(
        "[tutorial.bootstrap] insert progress failed (non-fatal):",
        err instanceof Error ? err.message : err,
      );
    }
  } else {
    // Heartbeat: update last_seen_at so we know the user is still active.
    // Also stamp completed_at on the first 100% snapshot.
    try {
      const patch: Partial<typeof userTutorialProgress.$inferInsert> = {
        lastSeenAt: new Date(),
      };
      if (isFullyComplete && !progressRow.completedAt) {
        patch.completedAt = new Date();
      }
      await db
        .update(userTutorialProgress)
        .set(patch)
        .where(eq(userTutorialProgress.userId, input.userId));
    } catch {
      /* non-fatal */
    }
  }

  return {
    audience: input.audience,
    tier: input.tier,
    steps,
    total,
    completedCount,
    progress: total === 0 ? 0 : completedCount / total,
    currentStepId,
    isFullyComplete,
    isDismissed: !!progressRow?.dismissedAt,
    planAtStart: (progressRow?.planAtStart as TutorialPlanTier | undefined) ?? input.tier,
  };
}

// ---------------------------------------------------------------
// Snapshot builders
// ---------------------------------------------------------------

async function buildProfileSnapshot(
  input: BootstrapInput,
): Promise<ProfileSnapshot | null> {
  if (input.audience === "agency") {
    return buildAgencySnapshot(input);
  }
  return buildPlayerSnapshot(input);
}

async function buildPlayerSnapshot(
  input: BootstrapInput,
): Promise<ProfileSnapshot | null> {
  const profile = await db.query.playerProfiles.findFirst({
    where: eq(playerProfiles.userId, input.userId),
    columns: {
      id: true,
      avatarUrl: true,
      fullName: true,
      birthDate: true,
      nationality: true,
      positions: true,
      marketValueEur: true,
      status: true,
    },
  });

  if (!profile) return null;

  const [careerRows, statsRows, mediaRows, articleRows, honourRows, themeRow] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(careerItems)
        .where(eq(careerItems.playerId, profile.id)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(statsSeasons)
        .where(eq(statsSeasons.playerId, profile.id)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(playerMedia)
        .where(and(eq(playerMedia.playerId, profile.id), eq(playerMedia.type, "video"))),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(playerArticles)
        .where(eq(playerArticles.playerId, profile.id)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(playerHonours)
        .where(eq(playerHonours.playerId, profile.id)),
      db.query.profileThemeSettings.findFirst({
        where: eq(profileThemeSettings.playerId, profile.id),
        columns: { layout: true },
      }),
    ]);

  return {
    audience: "player",
    tier: input.tier,
    avatarUrl: profile.avatarUrl,
    fullName: profile.fullName,
    birthDate: profile.birthDate,
    nationalityCount: profile.nationality?.length ?? 0,
    positionsCount: profile.positions?.length ?? 0,
    marketValueEur: profile.marketValueEur,
    profileStatus: profile.status,
    themeLayout: themeRow?.layout ?? null,
    careerItemsCount: careerRows[0]?.count ?? 0,
    seasonStatsCount: statsRows[0]?.count ?? 0,
    mediaVideosCount: mediaRows[0]?.count ?? 0,
    articlesCount: articleRows[0]?.count ?? 0,
    honoursCount: honourRows[0]?.count ?? 0,
    // Agency fields (irrelevant for player path).
    agencyLogoUrl: null,
    agencyName: null,
    agencyHeadquarters: null,
    agencyDescription: null,
    agencyOperativeCountriesCount: 0,
    agencyServicesCount: 0,
    agencyPlayersCount: 0,
    agencyHeroHeadline: null,
    agencyTeamRelationsCount: 0,
  };
}

async function buildAgencySnapshot(
  input: BootstrapInput,
): Promise<ProfileSnapshot | null> {
  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, input.userId),
    columns: { agencyId: true, role: true },
  });

  if (!userProfile?.agencyId || userProfile.role !== "manager") return null;

  const agency = await db.query.agencyProfiles.findFirst({
    where: eq(agencyProfiles.id, userProfile.agencyId),
  });

  if (!agency) return null;

  const [playersRows, teamRelationsRows, themeRow] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(playerProfiles)
      .where(eq(playerProfiles.agencyId, agency.id)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(agencyTeamRelations)
      .where(eq(agencyTeamRelations.agencyId, agency.id)),
    db.query.agencyThemeSettings.findFirst({
      where: eq(agencyThemeSettings.agencyId, agency.id),
      columns: { layout: true, heroHeadline: true },
    }),
  ]);

  const services = Array.isArray(agency.services)
    ? (agency.services as unknown[]).filter((s) => {
        if (typeof s === "string") return s.trim().length > 0;
        if (s && typeof s === "object" && "title" in s) {
          const title = (s as { title?: unknown }).title;
          return typeof title === "string" && title.trim().length > 0;
        }
        return false;
      })
    : [];

  return {
    audience: "agency",
    tier: input.tier,
    // Player fields (unused).
    avatarUrl: null,
    fullName: null,
    birthDate: null,
    nationalityCount: 0,
    positionsCount: 0,
    marketValueEur: null,
    profileStatus: null,
    careerItemsCount: 0,
    seasonStatsCount: 0,
    mediaVideosCount: 0,
    articlesCount: 0,
    honoursCount: 0,
    // Theme is shared (player vs agency) — but for agency we read from
    // `agencyThemeSettings`. Steps that consult `themeLayout` will work
    // for both shapes.
    themeLayout: themeRow?.layout ?? null,
    // Agency fields.
    agencyLogoUrl: agency.logoUrl,
    agencyName: agency.name,
    agencyHeadquarters: agency.headquarters,
    agencyDescription: agency.description,
    agencyOperativeCountriesCount: agency.operativeCountries?.length ?? 0,
    agencyServicesCount: services.length,
    agencyPlayersCount: playersRows[0]?.count ?? 0,
    agencyHeroHeadline: themeRow?.heroHeadline ?? null,
    agencyTeamRelationsCount: teamRelationsRows[0]?.count ?? 0,
  };
}

function emptySnapshot(audience: PlanAudience, tier: TutorialPlanTier): ProfileSnapshot {
  return {
    audience,
    tier,
    avatarUrl: null,
    fullName: null,
    birthDate: null,
    nationalityCount: 0,
    positionsCount: 0,
    marketValueEur: null,
    profileStatus: null,
    themeLayout: null,
    careerItemsCount: 0,
    seasonStatsCount: 0,
    mediaVideosCount: 0,
    articlesCount: 0,
    honoursCount: 0,
    agencyLogoUrl: null,
    agencyName: null,
    agencyHeadquarters: null,
    agencyDescription: null,
    agencyOperativeCountriesCount: 0,
    agencyServicesCount: 0,
    agencyPlayersCount: 0,
    agencyHeroHeadline: null,
    agencyTeamRelationsCount: 0,
  };
}
