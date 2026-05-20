// Display labels (Spanish) for blog enum values. UI imports from here
// so the labels are centralized and the editor + admin + public surfaces
// all stay in sync.

import type { BlogCluster, BlogStatus } from "@/db/schema";

export const CLUSTER_LABELS: Record<BlogCluster, string> = {
  career_guidance: "Carrera del jugador",
  agency_ops: "Operaciones de agencia",
  industry_ar: "Industria AR",
};

export const STATUS_LABELS: Record<BlogStatus, string> = {
  draft: "Borrador",
  pending_review: "Pendiente de revisión",
  published: "Publicado",
  rejected: "Rechazado",
};

// Used by the StatusBadge component to pick a tint that matches the
// state semantically.
export const STATUS_TONE: Record<BlogStatus, "neutral" | "warning" | "success" | "danger"> = {
  draft: "neutral",
  pending_review: "warning",
  published: "success",
  rejected: "danger",
};
