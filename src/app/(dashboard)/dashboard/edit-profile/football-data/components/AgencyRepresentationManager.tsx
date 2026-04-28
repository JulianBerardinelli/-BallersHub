"use client";

import { useState } from "react";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { ShieldAlert, LogOut } from "lucide-react";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { disconnectFromAgency } from "@/app/actions/agency-representation";
import { useRouter } from "next/navigation";

import { bhButtonClass } from "@/components/ui/BhButton";
import { bhModalClassNames } from "@/lib/ui/heroui-brand";

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
        <div className="flex flex-col items-center justify-center p-6 text-center border rounded-lg border-white/[0.08] bg-bh-surface-1/50">
          <ShieldAlert className="w-8 h-8 text-bh-fg-4 mb-3" />
          <h4 className="text-bh-fg-2 font-medium">Sin Representación Oficial</h4>
          <p className="text-sm text-bh-fg-4 mt-1 max-w-sm">
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
            variant="flat"
            onPress={() => setIsOpen(true)}
            startContent={<LogOut className="w-4 h-4" />}
            className={bhButtonClass({ variant: "danger-soft", size: "sm" })}
          >
            Desvincularme
          </Button>
        }
      >
        <div className="flex items-center gap-4 rounded-bh-md border border-white/[0.08] bg-bh-surface-1/60 p-4">
          <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-bh-md border border-white/[0.08] bg-bh-surface-2">
            {agency.logoUrl ? (
              <img src={agency.logoUrl} alt={agency.name} className="h-full w-full object-cover" />
            ) : (
              <span className="font-bh-display text-lg font-bold uppercase text-bh-fg-3">
                {agency.name.substring(0, 2)}
              </span>
            )}
          </div>
          <div className="space-y-0.5">
            <h4 className="font-bh-display text-base font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
              {agency.name}
            </h4>
            <p className="font-bh-display text-[10px] font-bold uppercase tracking-[0.14em] text-bh-success">
              Vínculo activo
            </p>
          </div>
        </div>
      </SectionCard>

      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        backdrop="blur"
        classNames={bhModalClassNames}
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-bh-warning" />
            ¿Desvincularte de la agencia?
          </ModalHeader>
          <ModalBody className="text-bh-fg-2">
            <p className="text-sm leading-[1.55]">
              Estás a punto de desvincular unilateralmente tu perfil de la
              agencia <strong className="text-bh-fg-1">{agency.name}</strong>.
            </p>
            <p className="mt-2 text-[12px] leading-[1.55] text-bh-fg-3">
              Esto eliminará su nombre de tu perfil público y notificará al
              mánager de este cambio. Solo hacelo si tu vínculo de
              representación finalizó o tenés razones justificadas.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setIsOpen(false)}
              isDisabled={isProcessing}
              className={bhButtonClass({ variant: "ghost", size: "sm" })}
            >
              Cancelar
            </Button>
            <Button
              onPress={handleDisconnect}
              isLoading={isProcessing}
              className={bhButtonClass({ variant: "danger", size: "sm" })}
            >
              Sí, desvincularme
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
