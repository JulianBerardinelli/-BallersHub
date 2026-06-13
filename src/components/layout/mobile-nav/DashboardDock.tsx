"use client";

// Dashboard dock wrapper (players). Regroups the player navigation into
// Panel/Perfil/Plantilla/Ajustes, resolves the active route, and wires
// sign-out (confirm → server action). CSS-gated to < lg (where the desktop
// sidebar takes over).

import { useCallback, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useDisclosure } from "@heroui/react";

import { useRouter, usePathname } from "@/i18n/navigation";
import type { ClientDashboardNavSection } from "@/app/[locale]/(dashboard)/dashboard/navigation";
import { FloatingDock } from "./FloatingDock";
import { SignOutConfirmModal } from "./SignOutConfirmModal";
import {
  buildDashboardGroups,
  markCurrent,
  resolveDashboardActive,
} from "./ia/dashboard-ia";
import type { DockItemAction } from "./types";

export type DashboardDockProps = {
  /** Player navigation from navigation.ts (route source of truth). */
  sections: ClientDashboardNavSection[];
  isPro: boolean;
  onSignOut: () => Promise<void>;
};

export function DashboardDock({ sections, isPro, onSignOut }: DashboardDockProps) {
  const t = useTranslations("mobileNav");
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, onOpenChange, onOpen, onClose } = useDisclosure();
  const [pending, startTransition] = useTransition();

  const baseGroups = buildDashboardGroups(sections, t, { isPro });
  const { activeGroupId, activeHref } = resolveDashboardActive(baseGroups, pathname);
  const groups = markCurrent(baseGroups, activeHref);

  const handleNavigate = useCallback((href: string) => router.push(href), [router]);

  const handleAction = useCallback(
    (action: DockItemAction) => {
      if (action === "sign-out") onOpen();
    },
    [onOpen],
  );

  const confirmSignOut = useCallback(() => {
    startTransition(() => {
      void onSignOut().then(() => {
        onClose();
        router.push("/");
        router.refresh();
      });
    });
  }, [onSignOut, onClose, router]);

  return (
    <>
      <FloatingDock
        className="lg:hidden"
        groups={groups}
        activeGroupId={activeGroupId}
        onNavigate={handleNavigate}
        onAction={handleAction}
      />
      <SignOutConfirmModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onConfirm={confirmSignOut}
        pending={pending}
      />
    </>
  );
}
