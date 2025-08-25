"use client";

import { Modal, ModalContent, ModalBody, Input, ScrollShadow } from "@heroui/react";
import { Search } from "lucide-react";
import ResultsListMobile from "./ResultsListMobile";
import type { PlayerHit } from "../usePlayerSearch";

export default function MobileModal(props: {
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
      placement="center"
      size="lg"
      classNames={{
        /** modal “casi full” pero con respiración lateral y radios */
        base: "md:hidden mx-3 w-[calc(100vw-1.5rem)] max-w-[680px] h-[88vh] rounded-2xl",
        body: "p-0",
      }}
    >
      <ModalContent>
        {() => (
          <ModalBody>
            {/* Barra sticky */}
            <div className="sticky top-0 z-10 bg-content1/80 backdrop-blur px-3 pt-3 pb-2 border-b border-content3/20">
              <form onSubmit={onSubmit}>
                <Input
                  aria-label="Search players"
                  placeholder="Search players…"
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
            </div>

            {/* Resultados scrollables */}
            <div className="px-3 pb-3">
              <div className="h-[70vh] pr-1">
                <ScrollShadow hideScrollBar className="h-full">
                  <ResultsListMobile
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
