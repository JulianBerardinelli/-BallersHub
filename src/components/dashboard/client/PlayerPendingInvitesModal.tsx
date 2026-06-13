"use client";

import { useEffect, useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { acceptPlayerInvite, rejectPlayerInvite } from "@/app/actions/player-invites-client";

interface PendingPlayerInvite {
  id: string;
  agencyName: string;
  contractEndDate: string | Date | null;
}

export default function PlayerPendingInvitesModal({ invites }: { invites: PendingPlayerInvite[] }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [activeInvite, setActiveInvite] = useState<PendingPlayerInvite | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (invites && invites.length > 0) {
      setActiveInvite(invites[0]);
      setIsOpen(true);
    }
  }, [invites]);

  const handleAccept = async () => {
    if (!activeInvite) return;
    setIsProcessing(true);
    const res = await acceptPlayerInvite(activeInvite.id);
    setIsProcessing(false);
    
    if (res.error) {
      alert(res.error);
    } else {
      setIsOpen(false);
      router.refresh(); 
    }
  };

  const handleReject = async () => {
    if (!activeInvite) return;
    setIsProcessing(true);
    const res = await rejectPlayerInvite(activeInvite.id);
    setIsProcessing(false);

    if (res.error) {
      alert(res.error);
    } else {
      setIsOpen(false);
      router.refresh();
    }
  };

  if (!activeInvite) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={setIsOpen} isDismissable={false} hideCloseButton backdrop="blur">
      <ModalContent className="bg-neutral-900 border border-neutral-800">
        <ModalHeader className="flex flex-col gap-1 text-white">{t("invites.playerPendingModal.title")}</ModalHeader>
        <ModalBody className="text-neutral-300">
          <p>
            {t.rich("invites.playerPendingModal.bodyLead", {
              agencyName: activeInvite.agencyName,
              strong: (chunks) => <strong className="text-white">{chunks}</strong>,
            })}
          </p>
          {activeInvite.contractEndDate && (
            <p className="text-sm text-neutral-400">
              {t("invites.playerPendingModal.contractDuration", {
                date: new Date(activeInvite.contractEndDate).toLocaleDateString(locale, { timeZone: "UTC" }),
              })}
            </p>
          )}
          <p className="text-sm text-neutral-400 mt-2">
            {t("invites.playerPendingModal.bodyConsequence")}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="flat" onPress={handleReject} isLoading={isProcessing}>
            {t("invites.playerPendingModal.decline")}
          </Button>
          <Button color="primary" onPress={handleAccept} isLoading={isProcessing}>
            {t("invites.playerPendingModal.accept")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
