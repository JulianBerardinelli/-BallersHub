"use client";

import { Modal, ModalContent, ModalBody, Input, ScrollShadow } from "@heroui/react";
import { Search } from "lucide-react";
import ResultsTable from "./ResultsTable";
import type { SearchHit, SearchResults } from "./usePlayerSearch";

export default function SearchModal(props: {
  isOpen: boolean;
  onClose: () => void;
  q: string;
  setQ: (v: string) => void;
  results: SearchResults;
  loading: boolean;
  onSelect: (hit: SearchHit) => void;
  onHoverHit?: (hit: SearchHit) => void;
}) {
  const { isOpen, onClose, q, setQ, results, loading, onSelect, onHoverHit } = props;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const first =
      results.players[0] ?? results.agencies[0] ?? results.managers[0] ?? null;
    if (first) onSelect(first);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      backdrop="blur"
      isDismissable
      size="3xl"
      placement="center"
      classNames={{
        base: "max-w-[980px] bg-bh-surface-1 border border-white/[0.08] shadow-[0_32px_80px_rgba(0,0,0,0.7)]",
        backdrop: "backdrop-blur-md bg-black/75",
      }}
    >
      <ModalContent>
        {() => (
          <ModalBody className="px-0 py-0">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <form onSubmit={onSubmit}>
                <Input
                  aria-label="Buscar jugadores y agencias"
                  placeholder="Buscar jugadores, agencias, agentes..."
                  value={q}
                  onValueChange={setQ}
                  autoFocus
                  variant="flat"
                  size="lg"
                  startContent={<Search className="size-4 text-bh-fg-3" />}
                  isClearable
                  onClear={() => setQ("")}
                  classNames={{
                    inputWrapper:
                      "border-0 bg-transparent shadow-none ring-0 outline-none " +
                      "hover:bg-transparent data-[hover=true]:bg-transparent " +
                      "group-data-[focus=true]:bg-transparent data-[focus=true]:bg-transparent " +
                      "focus-within:bg-transparent",
                    input:
                      "text-[15px] text-bh-fg-1 placeholder:text-bh-fg-3",
                  }}
                />
              </form>
            </div>

            <div className="h-[460px] px-2 pb-2">
              <ScrollShadow hideScrollBar className="h-full">
                <ResultsTable
                  results={results}
                  query={q}
                  loading={loading}
                  onSelect={onSelect}
                  onHoverHit={onHoverHit}
                />
              </ScrollShadow>
            </div>

            <div className="flex items-center gap-2 border-t border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[11px] text-bh-fg-4">
              <span className="rounded-[4px] border border-white/[0.1] bg-white/[0.07] px-1.5 py-[1px] font-bh-mono">
                ↑↓
              </span>
              <span>navegar</span>
              <span className="ml-3 rounded-[4px] border border-white/[0.1] bg-white/[0.07] px-1.5 py-[1px] font-bh-mono">
                ↵
              </span>
              <span>seleccionar</span>
              <span className="ml-3 rounded-[4px] border border-white/[0.1] bg-white/[0.07] px-1.5 py-[1px] font-bh-mono">
                esc
              </span>
              <span>cerrar</span>
            </div>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
}
