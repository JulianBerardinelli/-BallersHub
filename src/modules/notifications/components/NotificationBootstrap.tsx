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

type Props = {
  userName?: string | null;
  onboarding?: OnboardingSnapshot | null;
  latestReview?: ReviewSnapshot | null;
  adminEdits?: AdminEditSnapshot[] | null;
};

const DASHBOARD_FALLBACK = "/dashboard";
const REVIEW_DETAILS_FALLBACK = "/dashboard/edit-profile/football-data";

export function NotificationBootstrap({ userName, onboarding, latestReview, adminEdits }: Props) {
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

  return null;
}

export default NotificationBootstrap;
