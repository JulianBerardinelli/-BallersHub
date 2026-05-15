// Tutorial Assistant — shared types.
//
// A "step set" is the concrete list of steps a user sees, picked at
// runtime from `audience × plan`. Each step is auto-detected: we don't
// persist completion server-side; we recompute it from the actual
// profile state every render.

import type { PlanAudience } from "@/lib/dashboard/plan-access";

export type TutorialPlanTier = "free" | "pro";

export type TutorialStepId =
  // Player
  | "player.avatar"
  | "player.basics"
  | "player.career"
  | "player.season-stats"
  | "player.media"
  | "player.press-articles"
  | "player.published"
  | "player.market-value"
  | "player.honours"
  | "player.template-pro"
  // Agency
  | "agency.logo"
  | "agency.basics"
  | "agency.first-player"
  | "agency.countries"
  | "agency.services"
  | "agency.template-pro"
  | "agency.hero-headline"
  | "agency.team-relations";

export type TutorialStep = {
  id: TutorialStepId;
  /** Short title shown in the dock. */
  title: string;
  /** Optional one-line subtitle / hint. */
  subtitle?: string;
  /** Where the CTA "Ir al paso" navigates. */
  href: string;
  /** Resolved at render: did the user already complete this step? */
  completed: boolean;
};

export type TutorialState = {
  audience: PlanAudience;
  tier: TutorialPlanTier;
  steps: TutorialStep[];
  /** Total steps in the set. */
  total: number;
  /** Number of completed steps right now. */
  completedCount: number;
  /** Tier completion: completed/total. */
  progress: number;
  /** First step that is still pending — drives the "current step" highlight. */
  currentStepId: TutorialStepId | null;
  /** True when 100% complete. */
  isFullyComplete: boolean;
  /** User has dismissed the dock previously. */
  isDismissed: boolean;
  /** Snapshot when the user originally opened the tutorial. */
  planAtStart: TutorialPlanTier | null;
};
