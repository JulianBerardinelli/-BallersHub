import { EnqueueNotificationOptions, NotificationTemplateKey, TemplateContext } from "./types";

type Builder<T extends NotificationTemplateKey> = (
  context: TemplateContext<T>,
  id?: string,
) => EnqueueNotificationOptions<T>;

export const onboardingNotification = {
  submitted: ((context, id) => ({ template: "onboarding.submitted", context, id })) satisfies Builder<"onboarding.submitted">,
  approved: ((context, id) => ({ template: "onboarding.approved", context, id })) satisfies Builder<"onboarding.approved">,
  rejected: ((context, id) => ({ template: "onboarding.rejected", context, id })) satisfies Builder<"onboarding.rejected">,
};

export const reviewNotification = {
  submitted: ((context, id) => ({ template: "review.submitted", context, id })) satisfies Builder<"review.submitted">,
  approved: ((context, id) => ({ template: "review.approved", context, id })) satisfies Builder<"review.approved">,
  rejected: ((context, id) => ({ template: "review.rejected", context, id })) satisfies Builder<"review.rejected">,
};

export const announcementNotification = {
  general: ((context, id) => ({ template: "announcement.general", context, id })) satisfies Builder<"announcement.general">,
};

export const profileNotification = {
  updated: ((context, id) => ({ template: "profile.updated", context, id })) satisfies Builder<"profile.updated">,
};
