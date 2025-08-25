// src/components/layout/searchbar/Trigger.tsx
"use client";

import { Input } from "@heroui/react";
import { Search } from "lucide-react";

export default function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="hidden md:block w-64 lg:w-80">
      <Input
        aria-label="Buscar jugadores"
        placeholder="Buscar jugadores…"
        variant="bordered"
        startContent={<Search className="size-4" />}
        readOnly
        onClick={onOpen}  // sin onFocus para que no se reabra al cerrar
      />
    </div>
  );
}
