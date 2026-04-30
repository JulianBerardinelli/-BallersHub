/**
 * Marketing email infrastructure — public surface.
 *
 * Phase 1 (foundation): suppression list, audience resolution, dispatch
 * worker, unsubscribe tokens, webhook signature verification.
 *
 * Phase 2 will add the template registry + concrete templates and wire
 * the dispatcher to a real admin UI / cron.
 */
export {
  signUnsubscribeToken,
  verifyUnsubscribeToken,
  type VerifiedUnsubscribe,
} from "./unsubscribe-token";

export {
  suppress,
  unsuppress,
  filterSuppressed,
  isSuppressed,
  type UnsubscribeReason,
} from "./suppression";

export {
  resolveAudience,
  filterByFrequencyCap,
  type AudienceSegment,
  type AudienceFilter,
} from "./audiences";

export { runCampaign, type DispatchInput, type DispatchResult } from "./dispatch";

export { verifyResendWebhook } from "./verify-resend-webhook";
