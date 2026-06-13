"use client";

// Public-site dock wrapper. Builds the public IA, wires the i18n router, share
// (Web Share API + clipboard fallback) and sign-out (confirm → server action),
// then renders the generic FloatingDock. CSS-gated to mobile (md:hidden).

import { useCallback, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useDisclosure } from "@heroui/react";

import { useRouter, usePathname } from "@/i18n/navigation";
import { FloatingDock } from "./FloatingDock";
import { SignOutConfirmModal } from "./SignOutConfirmModal";
import { DockToast } from "./DockToast";
import { buildPublicGroups, publicActiveGroupId } from "./ia/public-ia";
import type { DockItemAction, DockUser } from "./types";

export type PublicDockProps = {
  user: DockUser | null;
  isPro: boolean;
  /** Public profile path (/{slug} or /agency/{slug}); null when none. */
  publicHref: string | null;
  onSignOut: () => Promise<void>;
};

export function PublicDock({ user, isPro, publicHref, onSignOut }: PublicDockProps) {
  const t = useTranslations("mobileNav");
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const groups = buildPublicGroups({ user, isPro, publicHref }, t);
  const activeGroupId = publicActiveGroupId(pathname);

  const handleNavigate = useCallback((href: string) => router.push(href), [router]);

  const handleShare = useCallback(async () => {
    if (!publicHref || typeof window === "undefined") return;
    const url = `${window.location.origin}${publicHref}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: t("account.shareText"), url });
        return;
      }
    } catch {
      // user cancelled the native share sheet — stop here, no fallback toast.
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast(t("account.linkCopied"));
    } catch {
      router.push(publicHref);
    }
  }, [publicHref, router, t]);

  const handleAction = useCallback(
    (action: DockItemAction) => {
      switch (action) {
        case "login":
          router.push("/auth/sign-in");
          break;
        case "signup":
          router.push("/auth/sign-up");
          break;
        case "share":
          void handleShare();
          break;
        case "sign-out":
          onOpen();
          break;
      }
    },
    [router, handleShare, onOpen],
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
        className="md:hidden"
        groups={groups}
        activeGroupId={activeGroupId}
        user={user}
        dangerColor="#FF5C5C"
        onNavigate={handleNavigate}
        onAction={handleAction}
      />
      <SignOutConfirmModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onConfirm={confirmSignOut}
        pending={pending}
      />
      <DockToast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
