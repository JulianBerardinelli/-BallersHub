"use client";

import { useNotificationContext } from "../NotificationProvider";

export const useNotificationCenter = () => {
  return useNotificationContext();
};
