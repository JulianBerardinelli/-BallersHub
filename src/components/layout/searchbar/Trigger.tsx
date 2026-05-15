// src/components/layout/searchbar/Trigger.tsx
"use client";

import { Search } from "lucide-react";

export default function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Buscar jugadores"
      className="hidden min-w-[200px] items-center gap-2 rounded-bh-md border border-white/[0.1] bg-white/[0.07] px-3.5 py-1.5 text-left transition-colors duration-150 hover:border-white/[0.18] hover:bg-white/[0.11] md:inline-flex"
    >
      <Search className="size-3.5 text-bh-fg-3" />
      <span className="flex-1 text-[12px] text-bh-fg-3">Buscar jugadores...</span>
      <span className="rounded-[4px] border border-white/[0.1] bg-white/[0.07] px-1.5 py-[1px] font-bh-mono text-[10px] text-bh-fg-3">
        ⌘K
      </span>
    </button>
  );
}
