"use client";

import { useState } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
  useDisclosure,
} from "@heroui/react";
import { CheckCircle2, Send } from "lucide-react";

import { bhButtonClass } from "@/components/ui/BhButton";
import { isAdminEditDomain } from "@/lib/admin/edit-domains";
import { adminEditSectionLabel } from "@/lib/admin/edit-sections";
import { adminFinalizeReview } from "../actions";

/**
 * Sticky "Finalizar revisión" bar. Saves apply live + audit silently; this is
 * the deliberate close where the admin writes a note that is emailed + shown
 * in-app to the player. Knows the active section from the route segment.
 */
export default function FinalizeReviewBar({ playerId }: { playerId: string }) {
  const segment = useSelectedLayoutSegment() ?? "datos";
  const domain = isAdminEditDomain(segment) ? segment : "datos";
  const sectionLabel = adminEditSectionLabel(domain);

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    setError(null);
    if (note.trim().length === 0) {
      setError("Escribí una nota para el jugador.");
      return;
    }
    setPending(true);
    const res = await adminFinalizeReview({ playerId, domain, note: note.trim() });
    setPending(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    setSent(true);
    setNote("");
    setTimeout(() => {
      setSent(false);
      onClose();
    }, 1200);
  }

  return (
    <>
      <div className="sticky bottom-4 z-20 flex justify-end pt-2">
        <Button
          onPress={onOpen}
          className={bhButtonClass({ variant: "lime", size: "sm" })}
          startContent={<CheckCircle2 size={16} />}
        >
          Finalizar revisión · {sectionLabel}
        </Button>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur" placement="center">
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-base font-bold text-bh-fg-1">Finalizar revisión · {sectionLabel}</span>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-bh-fg-3">
                  Escribí una nota explicando qué revisaste o corregiste. Se la enviamos al jugador
                  por email y le aparece al ingresar a su dashboard.
                </p>
                <Textarea
                  value={note}
                  onValueChange={setNote}
                  minRows={4}
                  maxLength={1000}
                  placeholder="Ej: Corregí las fechas de tu etapa en River tras revisar tu Transfermarkt."
                  aria-label="Nota de revisión"
                />
                {error ? <p className="text-sm text-bh-danger">{error}</p> : null}
                {sent ? (
                  <p className="inline-flex items-center gap-1.5 text-sm text-bh-success">
                    <CheckCircle2 size={14} /> Notificación enviada al jugador.
                  </p>
                ) : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={close} isDisabled={pending}>
                  Cancelar
                </Button>
                <Button
                  onPress={submit}
                  isLoading={pending}
                  className={bhButtonClass({ variant: "lime", size: "sm" })}
                  startContent={!pending ? <Send size={16} /> : undefined}
                >
                  Enviar al jugador
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
