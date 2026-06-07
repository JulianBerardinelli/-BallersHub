"use client";

import { Button } from "@heroui/react";
import { Pencil, X } from "lucide-react";

type Props = {
  isEditing: boolean;
  onPress: () => void;
  isDisabled?: boolean;
  ariaLabel: string;
};

export default function EditPencilButton({ isEditing, onPress, isDisabled, ariaLabel }: Props) {
  return (
    <Button
      size="sm"
      variant="light"
      isIconOnly
      aria-label={isEditing ? `Cancelar edición de ${ariaLabel}` : `Editar ${ariaLabel}`}
      onPress={onPress}
      isDisabled={isDisabled}
    >
      {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
    </Button>
  );
}
