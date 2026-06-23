"use client";

import { useEffect } from "react";

import { useNotificationContext } from "../NotificationProvider";
import {
  onboardingNotification,
  reviewNotification,
  adminNotification,
} from "../builders";
import { ensureEventRecorded } from "@/modules/notifications/utils/eventStore";
import type { AdminEditDomain } from "@/lib/admin/edit-domains";

type OnboardingSnapshot = {
  requestId: string;
  status: string | null | undefined;
  reviewedAt?: string | null;
  moderatorMessage?: string | null;
  dashboardHref?: string | null;
  retryHref?: string | null;
};

type ReviewSnapshot = {
  requestId: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  submittedAt?: string | null;
  reviewedAt?: string | null;
  moderatorMessage?: string | null;
  detailsHref?: string | null;
  retryHref?: string | null;
  topicLabel: string;
};

type AdminEditSnapshot = {
  /** notifications.id — the stable per-device dedupe key. */
  id: string;
  domain: AdminEditDomain;
  note: string;
  detailsHref?: string | null;
};

type CoachAdminEditSnapshot = {
  /** notifications.id — the stable per-device dedupe key. */
  id: string;
  /** Pre-resolved section label (coach domains differ from AdminEditDomain). */
  sectionLabel: string;
  note: string;
  detailsHref?: string | null;
};

type NationalTeamReviewSnapshot = {
  /** notifications.id — the stable per-device dedupe key. */
  id: string;
  result: "approved" | "rejected";
  note?: string | null;
  detailsHref?: string | null;
};

type Props = {
  userName?: string | null;
  onboarding?: OnboardingSnapshot | null;
  latestReview?: ReviewSnapshot | null;
  adminEdits?: AdminEditSnapshot[] | null;
  coachAdminEdits?: CoachAdminEditSnapshot[] | null;
  nationalTeamReviews?: NationalTeamReviewSnapshot[] | null;
};

const DASHBOARD_FALLBACK = "/dashboard";
const REVIEW_DETAILS_FALLBACK = "/dashboard/edit-profile/football-data";

export function NotificationBootstrap({ userName, onboarding, latestReview, adminEdits, coachAdminEdits, nationalTeamReviews }: Props) {
  const { enqueue } = useNotificationContext();

  useEffect(() => {
    if (!onboarding?.requestId || !onboarding.status) {
      return;
    }

    const normalizedStatus = onboarding.status.toLowerCase();

    if (normalizedStatus === "approved") {
      const eventId = `onboarding.status.approved:${onboarding.requestId}`;
      if (!ensureEventRecorded(eventId)) {
        return;
      }

      enqueue(
        onboardingNotification.approved(
          {
            userName: userName ?? undefined,
            requestId: onboarding.requestId,
            dashboardHref: onboarding.dashboardHref ?? DASHBOARD_FALLBACK,
          },
          eventId,
        ),
      );
      return;
    }

    if (normalizedStatus === "rejected") {
      const eventId = `onboarding.status.rejected:${onboarding.requestId}`;
      if (!ensureEventRecorded(eventId)) {
        return;
      }

      enqueue(
        onboardingNotification.rejected(
          {
            userName: userName ?? undefined,
            requestId: onboarding.requestId,
            retryHref: onboarding.retryHref ?? undefined,
            moderatorMessage: onboarding.moderatorMessage ?? undefined,
          },
          eventId,
        ),
      );
    }
  }, [enqueue, onboarding, userName]);

  useEffect(() => {
    if (!latestReview?.requestId) {
      return;
    }

    const { status } = latestReview;
    const topicLabel = latestReview.topicLabel;

    if (status === "approved") {
      const eventId = `review.status.approved:${latestReview.requestId}`;
      if (!ensureEventRecorded(eventId)) {
        return;
      }

      enqueue(
        reviewNotification.approved(
          {
            userName: userName ?? undefined,
            requestId: latestReview.requestId,
            topicLabel,
            detailsHref: latestReview.detailsHref ?? REVIEW_DETAILS_FALLBACK,
          },
          eventId,
        ),
      );
      return;
    }

    if (status === "rejected") {
      const eventId = `review.status.rejected:${latestReview.requestId}`;
      if (!ensureEventRecorded(eventId)) {
        return;
      }

      enqueue(
        reviewNotification.rejected(
          {
            userName: userName ?? undefined,
            requestId: latestReview.requestId,
            topicLabel,
            retryHref: latestReview.retryHref ?? REVIEW_DETAILS_FALLBACK,
            moderatorMessage: latestReview.moderatorMessage ?? undefined,
          },
          eventId,
        ),
      );
    }
  }, [enqueue, latestReview, userName]);

  // Staff edits made from the admin CRUD. Each unread `notifications` row is
  // toasted once per device (dedupe by its stable id); the server-side
  // `read_at` governs the persistent/cross-device state + future bell center.
  useEffect(() => {
    if (!adminEdits || adminEdits.length === 0) {
      return;
    }

    for (const edit of adminEdits) {
      const eventId = `admin.edit:${edit.id}`;
      if (!ensureEventRecorded(eventId)) {
        continue;
      }

      enqueue(
        adminNotification.profileCorrected(
          {
            userName: userName ?? undefined,
            domain: edit.domain,
            note: edit.note,
            detailsHref: edit.detailsHref ?? undefined,
          },
          eventId,
        ),
      );
    }
  }, [enqueue, adminEdits, userName]);

  // Coach variant — same machinery, isolated kind (zero player regression).
  useEffect(() => {
    if (!coachAdminEdits || coachAdminEdits.length === 0) {
      return;
    }

    for (const edit of coachAdminEdits) {
      const eventId = `admin.coachEdit:${edit.id}`;
      if (!ensureEventRecorded(eventId)) {
        continue;
      }

      enqueue(
        adminNotification.coachProfileCorrected(
          {
            userName: userName ?? undefined,
            sectionLabel: edit.sectionLabel,
            note: edit.note,
            detailsHref: edit.detailsHref ?? undefined,
          },
          eventId,
        ),
      );
    }
  }, [enqueue, coachAdminEdits, userName]);

  // "Selección Nacional" moderation results (approve/reject from the admin
  // queue). One toast per unread notification row, deduped per device by id.
  useEffect(() => {
    if (!nationalTeamReviews || nationalTeamReviews.length === 0) {
      return;
    }

    for (const review of nationalTeamReviews) {
      const eventId = `admin.nationalTeam:${review.id}`;
      if (!ensureEventRecorded(eventId)) {
        continue;
      }

      const builder =
        review.result === "approved"
          ? adminNotification.nationalTeamApproved
          : adminNotification.nationalTeamRejected;

      enqueue(
        builder(
          {
            userName: userName ?? undefined,
            note: review.note ?? undefined,
            detailsHref: review.detailsHref ?? undefined,
          },
          eventId,
        ),
      );
    }
  }, [enqueue, nationalTeamReviews, userName]);

  return null;
}

export default NotificationBootstrap;
