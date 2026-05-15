import type { ReactNode } from "react";

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
  | "profile.updated";

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
