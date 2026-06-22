import type { ReactNode } from "react";
import type { AdminEditDomain } from "@/lib/admin/edit-domains";

export type NotificationCategory = "onboarding" | "review" | "announcement" | "profile";

export type NotificationTone = "info" | "success" | "warning" | "danger";

export type NotificationTemplateKey =
  | "onboarding.submitted"
  | "onboarding.approved"
  | "onboarding.rejected"
  | "review.submitted"
  | "review.approved"
  | "review.rejected"
  | "announcement.general"
  | "profile.updated"
  | "admin.profileCorrected"
  | "admin.coachProfileCorrected";

export type TemplateContextMap = {
  "onboarding.submitted": BaseContext;
  "onboarding.approved": BaseContext & { dashboardHref?: string };
  "onboarding.rejected": BaseContext & { retryHref?: string; moderatorMessage?: string };
  "review.submitted": BaseContext & { topicLabel: string };
  "review.approved": BaseContext & { topicLabel: string; detailsHref?: string };
  "review.rejected": BaseContext & { topicLabel: string; retryHref?: string; moderatorMessage?: string };
  "announcement.general": BaseContext & {
    headline?: string;
    body: string;
    ctaLabel?: string;
    ctaHref?: string;
  };
  "profile.updated": BaseContext & {
    sectionLabel: string;
    changedFields: string[];
    detailsHref?: string;
  };
  // Staff reviewed the player's profile from the admin CRUD and left a note.
  // Surfaced on the player's next login (persisted in the `notifications` table).
  "admin.profileCorrected": BaseContext & {
    domain: AdminEditDomain;
    note: string;
    detailsHref?: string;
  };
  // Coach variant — isolated from the player one (zero player regression). The
  // coach edit domains differ (licencias/idiomas), so the section label is
  // resolved server-side and carried verbatim instead of via AdminEditDomain.
  "admin.coachProfileCorrected": BaseContext & {
    sectionLabel: string;
    note: string;
    detailsHref?: string;
  };
};

type BaseContext = {
  userName?: string;
  requestId?: string;
  createdAt?: Date;
};

export type TemplateContext<T extends NotificationTemplateKey> = TemplateContextMap[T];

export type NotificationTemplate<T extends NotificationTemplateKey> = {
  key: T;
  category: NotificationCategory;
  tone: NotificationTone;
  headline: (ctx: TemplateContext<T>) => string;
  body: (ctx: TemplateContext<T>) => ReactNode;
  details?: (ctx: TemplateContext<T>) => ReactNode | undefined;
  cta?: (ctx: TemplateContext<T>) => NotificationCTA | undefined;
  expandable?: boolean;
};

export type NotificationCTA = {
  label: string;
  href: string;
};

export type NotificationPayload = {
  id: string;
  template: NotificationTemplateKey;
  title: string;
  message: ReactNode;
  details?: ReactNode;
  cta?: NotificationCTA;
  category: NotificationCategory;
  tone: NotificationTone;
  createdAt: string;
  expandable: boolean;
  read: boolean;
};

export interface EnqueueNotificationOptions<T extends NotificationTemplateKey> {
  template: T;
  context: TemplateContext<T>;
  id?: string;
  overrides?: Partial<Pick<NotificationPayload, "cta" | "details" | "title" | "message" | "expandable">>;
}

export type NotificationState = {
  notifications: NotificationPayload[];
  dismissedIds: Set<string>;
};

export type NotificationContextValue = {
  notifications: NotificationPayload[];
  dismissedIds: Set<string>;
  enqueue: <T extends NotificationTemplateKey>(options: EnqueueNotificationOptions<T>) => NotificationPayload | undefined;
  dismiss: (id: string) => void;
  resetDismissed: () => void;
};
