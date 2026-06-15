// Display labels (Spanish) for blog enum values. Public /blog chrome now
// reads cluster + status labels via next-intl (`blog.clusters.*` /
// `blog.status.*` in src/i18n/messages/<locale>/blog.json), so these
// constants stay around for callers OUTSIDE that i18n pass: admin UI
// (`/admin/blog/*`), action emails (`blog/write/actions.ts`,
// `admin/blog/actions.ts`), and as the canonical key enumerator for
// CLUSTER_LABELS / STATUS_TONE everywhere. Don't drop them.

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
