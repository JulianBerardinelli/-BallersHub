import type { PlayerTaskMetrics } from "./metrics";
import type { ClientTaskContext, EvaluatedTask, TaskEvaluation, TaskSeverity } from "./tasks";

export type TaskProfileSnapshot = {
  id: string;
  status: string;
  slug: string | null;
  visibility: string;
  full_name: string | null;
  birth_date: string | null;
  nationality: string[] | null;
  positions: string[] | null;
  current_club: string | null;
  bio: string | null;
  avatar_url: string | null;
  foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;
};

export const EMPTY_PLAYER_TASK_METRICS: PlayerTaskMetrics = {
  careerItems: 0,
  media: { total: 0, photos: 0, videos: 0, docs: 0 },
  contactReferences: 0,
};

export function buildTaskContext(
  profile: TaskProfileSnapshot | null,
  metrics: PlayerTaskMetrics,
): ClientTaskContext {
  return {
    profile: profile
      ? {
          id: profile.id,
          status: profile.status,
          slug: profile.slug,
          visibility: profile.visibility,
          full_name: profile.full_name,
          birth_date: profile.birth_date,
          nationality: profile.nationality,
          positions: profile.positions,
          current_club: profile.current_club,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          foot: profile.foot,
          height_cm: profile.height_cm,
          weight_kg: profile.weight_kg,
        }
      : null,
    metrics,
  };
}

export function getPendingTasksForSection(
  evaluation: TaskEvaluation,
  sectionId: string,
): EvaluatedTask[] {
  return evaluation.tasks.filter((task) => task.sectionId === sectionId && !task.completed);
}

export function getHighestSeverity(tasks: EvaluatedTask[]): TaskSeverity | null {
  if (tasks.some((task) => task.severity === "danger")) return "danger";
  if (tasks.some((task) => task.severity === "warning")) return "warning";
  if (tasks.some((task) => task.severity === "secondary")) return "secondary";
  return null;
}
