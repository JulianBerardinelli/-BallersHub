"use client";

import { Button } from "@heroui/react";
import { Search } from "lucide-react";

export default function TriggerMobile({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      isIconOnly
      variant="flat"
      aria-label="Search players"
      onPress={onOpen}
      className="md:hidden"
    >
      <Search className="size-5" />
    </Button>
  );
}
