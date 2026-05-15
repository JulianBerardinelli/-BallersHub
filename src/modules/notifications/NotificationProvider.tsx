"use client";

import React from "react";
import { notificationTemplates } from "./messages";
import {
  EnqueueNotificationOptions,
  NotificationContextValue,
  NotificationPayload,
  NotificationTemplateKey,
} from "./types";
import { NotificationCenter } from "./components/NotificationCenter";
import { loadDismissed, persistDismissed, resetDismissedStorage } from "./utils/storage";
import { playNotificationSound } from "./utils/sound";

const NotificationContext = React.createContext<NotificationContextValue | undefined>(undefined);
const MAX_VISIBLE_NOTIFICATIONS = 4;

const generateId = (template: NotificationTemplateKey, providedId?: string, fallback?: string) => {
  if (providedId) return providedId;
  if (fallback) return fallback;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${template}-${crypto.randomUUID()}`;
  }
  return `${template}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const buildNotification = <T extends NotificationTemplateKey>(
  options: EnqueueNotificationOptions<T>,
): NotificationPayload => {
  const { template, context, overrides } = options;
  const descriptor = notificationTemplates[template];
  const id = generateId(template, options.id, context.requestId);

  const title = overrides?.title ?? descriptor.headline(context as never);
  const message = overrides?.message ?? descriptor.body(context as never);
  const details = overrides?.details ?? descriptor.details?.(context as never);
  const cta = overrides?.cta ?? descriptor.cta?.(context as never);
  const createdAt = (context.createdAt ?? new Date()).toISOString();
  const expandable = overrides?.expandable ?? descriptor.expandable ?? Boolean(details);

  return {
    id,
    template,
    title,
    message,
    details,
    cta,
    category: descriptor.category,
    tone: descriptor.tone,
    createdAt,
    expandable,
    read: false,
  };
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = React.useState<NotificationPayload[]>([]);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setDismissedIds(loadDismissed());
  }, []);

  const enqueue = React.useCallback<NotificationContextValue["enqueue"]>((options) => {
    const payload = buildNotification(options);

    if (dismissedIds.has(payload.id)) {
      return undefined;
    }

    // TODO: sincronizar con envío de emails cuando el canal esté disponible.
    setNotifications((current) => {
      const next = [payload, ...current.filter((item) => item.id !== payload.id)];
      return next.slice(0, MAX_VISIBLE_NOTIFICATIONS);
    });
    playNotificationSound();

    return payload;
  }, [dismissedIds]);

  const dismiss = React.useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
    setDismissedIds((current) => {
      const next = new Set(current);
      next.add(id);
      persistDismissed(next);
      return next;
    });
  }, []);

  const resetDismissed = React.useCallback(() => {
    setDismissedIds(() => {
      const empty = new Set<string>();
      resetDismissedStorage();
      return empty;
    });
  }, []);

  const value = React.useMemo<NotificationContextValue>(
    () => ({ notifications, dismissedIds, enqueue, dismiss, resetDismissed }),
    [notifications, dismissedIds, enqueue, dismiss, resetDismissed],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationCenter />
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotificationContext debe utilizarse dentro de NotificationProvider");
  }
  return context;
};
