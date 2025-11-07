// app/providers.tsx
"use client";

import { HeroUIProvider } from "@heroui/react";
import { NotificationProvider } from "@/modules/notifications";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </HeroUIProvider>
  );
}
