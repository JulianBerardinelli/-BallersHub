// app/providers.tsx
"use client";

import { HeroUIProvider } from "@heroui/react";
import { NotificationProvider } from "@/modules/notifications/NotificationProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </HeroUIProvider>
  );
}
