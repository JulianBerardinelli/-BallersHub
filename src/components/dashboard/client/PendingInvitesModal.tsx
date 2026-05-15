"use client";

import { useEffect, useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { acceptAgencyInvite, rejectAgencyInvite } from "@/app/actions/agency-invites-client";

interface AgencyInvite {
  id: string;
  agencyName: string;
}

export default function PendingInvitesModal({ invites }: { invites: AgencyInvite[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeInvite, setActiveInvite] = useState<AgencyInvite | null>(null);
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
    const res = await acceptAgencyInvite(activeInvite.id);
    setIsProcessing(false);
    
    if (res.error) {
      alert(res.error);
    } else {
      setIsOpen(false);
      router.refresh(); // Refresh the whole dashboard to re-evaluate the role mapping
    }
  };

  const handleReject = async () => {
    if (!activeInvite) return;
    setIsProcessing(true);
    const res = await rejectAgencyInvite(activeInvite.id);
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
        <ModalHeader className="flex flex-col gap-1 text-white">¡Tienes una invitación pendiente!</ModalHeader>
        <ModalBody className="text-neutral-300">
          <p>
            Has sido invitado a formar parte del staff de la agencia <strong className="text-white">{activeInvite.agencyName}</strong>.
          </p>
          <p className="text-sm text-neutral-400">
            Al aceptar, tu cuenta cambiará a perfil de Manager y tendrás acceso a los jugadores representados por esta agencia.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="flat" onPress={handleReject} isLoading={isProcessing}>
            Rechazar
          </Button>
          <Button color="primary" onPress={handleAccept} isLoading={isProcessing}>
            Aceptar Invitación
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
