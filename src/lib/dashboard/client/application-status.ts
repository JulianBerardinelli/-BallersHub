const REVIEW_STATUSES = new Set(["pending", "pending_review"]);
const DRAFT_STATUSES = new Set(["draft", "in_progress"]);

export function normalizeApplicationStatus(status: string | null | undefined): string | null {
  if (!status) return null;
  const normalized = status.toLowerCase();

  if (normalized === "pending_review" || normalized === "in_review" || normalized === "submitted") {
    return "pending";
  }

  if (normalized === "in-progress") {
    return "in_progress";
  }

  return normalized;
}

export function hasActiveApplication(status: string | null | undefined): boolean {
  const normalized = normalizeApplicationStatus(status);
  if (!normalized) return false;
  return REVIEW_STATUSES.has(normalized);
}

export function isApplicationDraft(status: string | null | undefined): boolean {
  const normalized = normalizeApplicationStatus(status);
  if (!normalized) return false;
  return DRAFT_STATUSES.has(normalized);
}

export function isApplicationRejected(status: string | null | undefined): boolean {
  const normalized = normalizeApplicationStatus(status);
  return normalized === "rejected";
}

export function isApplicationApproved(status: string | null | undefined): boolean {
  const normalized = normalizeApplicationStatus(status);
  return normalized === "approved";
}
