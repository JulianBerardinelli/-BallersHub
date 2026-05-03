"use client";

import { Modal, ModalContent, ModalBody, Input, ScrollShadow } from "@heroui/react";
import { Search } from "lucide-react";
import ResultsListMobile from "./ResultsListMobile";
import type { SearchHit, SearchResults } from "../usePlayerSearch";

export default function MobileModal(props: {
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
      placement="center"
      size="lg"
      classNames={{
        base: "md:hidden mx-3 w-[calc(100vw-1.5rem)] max-w-[680px] h-[88vh] rounded-2xl",
        body: "p-0",
      }}
    >
      <ModalContent>
        {() => (
          <ModalBody>
            {/* Sticky search bar */}
            <div className="sticky top-0 z-10 bg-content1/80 backdrop-blur px-3 pt-3 pb-2 border-b border-content3/20">
              <form onSubmit={onSubmit}>
                <Input
                  aria-label="Buscar jugadores y agencias"
                  placeholder="Buscar jugadores, agencias…"
                  value={q}
                  onValueChange={setQ}
                  autoFocus
                  variant="flat"
                  size="lg"
                  startContent={<Search className="size-4" />}
                  isClearable
                  onClear={() => setQ("")}
                  classNames={{
                    inputWrapper:
                      "border-0 bg-transparent shadow-none ring-0 outline-none " +
                      "hover:bg-transparent data-[hover=true]:bg-transparent " +
                      "group-data-[focus=true]:bg-transparent data-[focus=true]:bg-transparent " +
                      "focus-within:bg-transparent",
                  }}
                />
              </form>
            </div>

            {/* Scrollable results */}
            <div className="px-3 pb-3">
              <div className="h-[70vh] pr-1">
                <ScrollShadow hideScrollBar className="h-full">
                  <ResultsListMobile
                    results={results}
                    query={q}
                    loading={loading}
                    onSelect={onSelect}
                    onHoverHit={onHoverHit}
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
