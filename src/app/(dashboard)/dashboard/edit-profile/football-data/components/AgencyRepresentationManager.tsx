"use client";

import { useState } from "react";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { ShieldAlert, LogOut } from "lucide-react";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { disconnectFromAgency } from "@/app/actions/agency-representation";
import { useRouter } from "next/navigation";

interface AgencyInfo {
  id: string;
  name: string;
  logoUrl?: string | null;
}

export default function AgencyRepresentationManager({ agency }: { agency: AgencyInfo | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  if (!agency) {
    return (
      <SectionCard
        title="Agencia Representante"
        description="Aún no tienes una agencia representante vinculada a tu perfil."
      >
        <div className="flex flex-col items-center justify-center p-6 text-center border rounded-lg border-neutral-800 bg-neutral-900/50">
          <ShieldAlert className="w-8 h-8 text-neutral-500 mb-3" />
          <h4 className="text-neutral-300 font-medium">Sin Representación Oficial</h4>
          <p className="text-sm text-neutral-500 mt-1 max-w-sm">
            Si tienes un representante, puedes pedirle que te envíe una invitación formal desde su panel para vincular tu perfil.
          </p>
        </div>
      </SectionCard>
    );
  }

  const handleDisconnect = async () => {
    setIsProcessing(true);
    const res = await disconnectFromAgency();
    setIsProcessing(false);

    if (res?.error) {
      alert(res.error);
    } else {
      setIsOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      <SectionCard
        title="Agencia Representante"
        description="Esta es la agencia que representa tu perfil deportiva y formalmente."
        actions={
          <Button
            size="sm"
            color="danger"
            variant="flat"
            onPress={() => setIsOpen(true)}
            startContent={<LogOut className="w-4 h-4" />}
          >
            Desvincularme
          </Button>
        }
      >
        <div className="flex items-center gap-4 p-4 border rounded-lg border-neutral-800 bg-neutral-900/50">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-neutral-800 flex items-center justify-center">
            {agency.logoUrl ? (
              <img src={agency.logoUrl} alt={agency.name} className="object-cover w-full h-full" />
            ) : (
              <span className="text-lg font-bold text-neutral-500">{agency.name.substring(0,2)}</span>
            )}
          </div>
          <div>
            <h4 className="text-white font-medium">{agency.name}</h4>
            <p className="text-xs text-emerald-500 font-medium tracking-wide">VÍNCULO ACTIVO</p>
          </div>
        </div>
      </SectionCard>

      <Modal isOpen={isOpen} onOpenChange={setIsOpen} backdrop="blur">
        <ModalContent className="bg-neutral-900 border border-neutral-800">
          <ModalHeader className="text-white">¿Desvincularte de la Agencia?</ModalHeader>
          <ModalBody className="text-neutral-300">
            <p>
              Estás a punto de desvincular unilateralmente tu perfil de la agencia <strong>{agency.name}</strong>.
            </p>
            <p className="text-sm text-neutral-400 mt-2">
              Esto eliminará su nombre de tu perfil público y notificará al mánager de este cambio. Solo hazlo si tu vínculo de representación ha finalizado o tienes razones justificadas.
            </p>
          </ModalBody>
          <ModalFooter>
             <Button variant="light" onPress={() => setIsOpen(false)} isDisabled={isProcessing}>
               Cancelar
             </Button>
             <Button color="danger" onPress={handleDisconnect} isLoading={isProcessing}>
               Sí, desvincularme
             </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
