"use client";

import { useEffect } from "react";

import {
  onboardingNotification,
  reviewNotification,
  useNotificationContext,
} from "@/modules/notifications";
import { ensureEventRecorded } from "@/modules/notifications/utils/eventStore";

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

type Props = {
  userName?: string | null;
  onboarding?: OnboardingSnapshot | null;
  latestReview?: ReviewSnapshot | null;
};

const DASHBOARD_FALLBACK = "/dashboard";
const REVIEW_DETAILS_FALLBACK = "/dashboard/edit-profile/football-data";

export function NotificationBootstrap({ userName, onboarding, latestReview }: Props) {
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
        onboardingNotification.approved({
          userName: userName ?? undefined,
          requestId: onboarding.requestId,
          dashboardHref: onboarding.dashboardHref ?? DASHBOARD_FALLBACK,
        }),
      );
      return;
    }

    if (normalizedStatus === "rejected") {
      const eventId = `onboarding.status.rejected:${onboarding.requestId}`;
      if (!ensureEventRecorded(eventId)) {
        return;
      }

      enqueue(
        onboardingNotification.rejected({
          userName: userName ?? undefined,
          requestId: onboarding.requestId,
          retryHref: onboarding.retryHref ?? undefined,
          moderatorMessage: onboarding.moderatorMessage ?? undefined,
        }),
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
        reviewNotification.approved({
          userName: userName ?? undefined,
          requestId: latestReview.requestId,
          topicLabel,
          detailsHref: latestReview.detailsHref ?? REVIEW_DETAILS_FALLBACK,
        }),
      );
      return;
    }

    if (status === "rejected") {
      const eventId = `review.status.rejected:${latestReview.requestId}`;
      if (!ensureEventRecorded(eventId)) {
        return;
      }

      enqueue(
        reviewNotification.rejected({
          userName: userName ?? undefined,
          requestId: latestReview.requestId,
          topicLabel,
          retryHref: latestReview.retryHref ?? REVIEW_DETAILS_FALLBACK,
          moderatorMessage: latestReview.moderatorMessage ?? undefined,
        }),
      );
    }
  }, [enqueue, latestReview, userName]);

  return null;
}

export default NotificationBootstrap;
