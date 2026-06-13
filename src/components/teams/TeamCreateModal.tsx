"use client";

import * as React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from "@heroui/react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("teamPicker");
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
        <ModalHeader className="pr-12">{t("createModal.title", { name })}</ModalHeader>
        <ModalBody className="grid gap-3">
          <CountrySinglePicker
            value={country}
            onChange={setCountry}
            isInvalid={countryInvalid}
            errorMessage={t("createModal.countryRequired")}
          />
          <Input
            label={t("createModal.tmLabel")}
            labelPlacement="outside"
            value={tmUrl}
            onChange={(e)=> setTmUrl(e.target.value)}
            isInvalid={touched && !urlOk}
            errorMessage={t("createModal.tmInvalid")}
            placeholder={t("createModal.tmPlaceholder")}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>{t("createModal.cancel")}</Button>
          <Button color="primary" onPress={save}>{t("createModal.save")}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
