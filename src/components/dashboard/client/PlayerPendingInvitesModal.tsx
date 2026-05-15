"use client";

import { useEffect, useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { acceptPlayerInvite, rejectPlayerInvite } from "@/app/actions/player-invites-client";

interface PendingPlayerInvite {
  id: string;
  agencyName: string;
  contractEndDate: string | Date | null;
}

export default function PlayerPendingInvitesModal({ invites }: { invites: PendingPlayerInvite[] }) {
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
        <ModalHeader className="flex flex-col gap-1 text-white">¡Nuevas oportunidades!</ModalHeader>
        <ModalBody className="text-neutral-300">
          <p>
            La agencia <strong className="text-white">{activeInvite.agencyName}</strong> ha solicitado incluirte en su cartera de jugadores representados en BallersHub.
          </p>
          {activeInvite.contractEndDate && (
            <p className="text-sm text-neutral-400">
              Duración del vínculo registrada: {new Date(activeInvite.contractEndDate).toLocaleDateString("es-AR", { timeZone: "UTC" })}.
            </p>
          )}
          <p className="text-sm text-neutral-400 mt-2">
            Al aceptar esta invitación, tu perfil deportivo mostrará públicamente a esta agencia como tu representante oficial.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="flat" onPress={handleReject} isLoading={isProcessing}>
            Rechazar
          </Button>
          <Button color="primary" onPress={handleAccept} isLoading={isProcessing}>
            Vincular mi perfil
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
