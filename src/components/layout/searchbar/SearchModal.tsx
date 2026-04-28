"use client";

import { Modal, ModalContent, ModalBody, Input, ScrollShadow } from "@heroui/react";
import { Search } from "lucide-react";
import ResultsTable from "./ResultsTable";
import type { PlayerHit } from "./usePlayerSearch";

export default function SearchModal(props: {
  isOpen: boolean;
  onClose: () => void;
  q: string;
  setQ: (v: string) => void;
  results: PlayerHit[];
  loading: boolean;
  onSelect: (hit: PlayerHit) => void;
  onHoverSlug?: (slug: string) => void;
}) {
  const { isOpen, onClose, q, setQ, results, loading, onSelect, onHoverSlug } = props;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (results.length > 0) onSelect(results[0]);
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
            <div className="border-b border-white/[0.06] p-4">
              <form onSubmit={onSubmit}>
                <Input
                  aria-label="Buscar jugadores"
                  placeholder="Buscar jugadores, agencias..."
                  value={q}
                  onValueChange={setQ}
                  autoFocus
                  variant="bordered"
                  size="lg"
                  startContent={<Search className="size-4 text-bh-fg-3" />}
                  isClearable
                  onClear={() => setQ("")}
                  classNames={{
                    inputWrapper:
                      "border-white/[0.1] bg-transparent hover:border-white/[0.18] data-[focus=true]:border-bh-lime data-[focus=true]:bg-transparent shadow-none",
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
                  onHoverSlug={onHoverSlug}
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
