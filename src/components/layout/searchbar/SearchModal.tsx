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
      /** más grande; podés subir a "4xl" si querés aún más */
      size="3xl"
      placement="center"
      /** aseguramos ancho mínimo amplio para 4 columnas */
      classNames={{
        base: "max-w-[980px]",
        backdrop: "backdrop-blur-md",
      }}
    >
      <ModalContent>
        {() => (
          <ModalBody>
            <div className="p-5">
              <form onSubmit={onSubmit}>
                <Input
                  aria-label="Buscar jugadores"
                  placeholder="Buscar jugadores…"
                  value={q}
                  onValueChange={setQ}
                  autoFocus
                  variant="bordered"
                  size="lg"
                  startContent={<Search className="size-4" />}
                  isClearable
                  onClear={() => setQ("")}
                />
              </form>

              {/* Alto fijo: no cambia de tamaño; scroll interno */}
              <div className="mt-4 h-[460px] pr-1">
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
            </div>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
}
