"use client";

import { Button } from "@heroui/react";
import { Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  isEditing: boolean;
  onPress: () => void;
  isDisabled?: boolean;
  ariaLabel: string;
};

export default function EditPencilButton({ isEditing, onPress, isDisabled, ariaLabel }: Props) {
  const t = useTranslations("dashAgency");
  return (
    <Button
      size="sm"
      variant="light"
      isIconOnly
      aria-label={
        isEditing
          ? t("common.cancelEditAria", { label: ariaLabel })
          : t("common.editAria", { label: ariaLabel })
      }
      onPress={onPress}
      isDisabled={isDisabled}
    >
      {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
    </Button>
  );
}
