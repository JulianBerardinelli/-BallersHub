"use client";

import * as React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from "@heroui/react";
import CountrySinglePicker, { type CountryPick } from "@/components/common/CountrySinglePicker";

export type NewTeamDetails = {
  country: CountryPick | null;
  tmUrl: string;
};

export default function TeamCreateModal({
  isOpen,
  name,
  initial,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  name: string;
  initial?: NewTeamDetails;
  onClose: () => void;
  onSave: (data: NewTeamDetails) => void;
}) {
  const [country, setCountry] = React.useState<CountryPick | null>(initial?.country ?? null);
  const [tmUrl, setTmUrl] = React.useState(initial?.tmUrl ?? "");
  const [touched, setTouched] = React.useState(false);

  const urlOk = !tmUrl || /^https?:\/\/[^ "]+$/i.test(tmUrl);
  const countryInvalid = touched && !country;

  function save() {
    setTouched(true);
    if (!country || !urlOk) return;
    onSave({ country, tmUrl: tmUrl.trim() });
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={(o)=> !o && onClose()} size="md" backdrop="blur" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="pr-12">Nuevo equipo: “{name}”</ModalHeader>
        <ModalBody className="grid gap-3">
          <CountrySinglePicker
            value={country}
            onChange={setCountry}
            isInvalid={countryInvalid}
            errorMessage="Elegí un país"
          />
          <Input
            label="Transfermarkt (opcional)"
            labelPlacement="outside"
            value={tmUrl}
            onChange={(e)=> setTmUrl(e.target.value)}
            isInvalid={touched && !urlOk}
            errorMessage="URL inválida (https://...)"
            placeholder="https://www.transfermarkt.com/..."
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>Cancelar</Button>
          <Button color="primary" onPress={save}>Guardar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
