"use client";

// Shared sign-out confirmation for the docks. Mirrors the dashboard sidebar's
// confirm flow (HeroUI Modal + danger button) and reuses the existing
// `common.userMenu` / `common.actions` strings so copy stays consistent.

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { useTranslations } from "next-intl";

export function SignOutConfirmModal({
  isOpen,
  onOpenChange,
  onConfirm,
  pending,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  const t = useTranslations("common");
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      classNames={{ base: "bg-bh-surface-1 border border-white/[0.08]" }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="text-bh-fg-1">{t("userMenu.signOut")}</ModalHeader>
            <ModalBody>
              <p className="text-sm text-bh-fg-2">{t("userMenu.signOutConfirm")}</p>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={onClose}
                isDisabled={pending}
                className="text-bh-fg-3"
              >
                {t("actions.cancel")}
              </Button>
              <Button color="danger" onPress={onConfirm} isLoading={pending}>
                {t("userMenu.signOut")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
