"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { NotificationCard } from "./NotificationCard";
import { useNotificationContext } from "../NotificationProvider";

export const NotificationCenter = () => {
  const { notifications, dismiss } = useNotificationContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-4 sm:max-w-md"
    >
      <AnimatePresence>
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationCard notification={notification} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
