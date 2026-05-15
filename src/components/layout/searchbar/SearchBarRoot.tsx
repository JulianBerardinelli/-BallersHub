"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import SearchTrigger from "./Trigger";            // desktop
import TriggerMobile from "./mobile/TriggerMobile";      // mobile
import SearchModal from "./SearchModal";          // desktop modal
import MobileModal from "./mobile/MobileModal";          // mobile modal
import { usePlayerSearch, type SearchHit } from "./usePlayerSearch";
import FullScreenLoader from "@/components/ui/FullScreenLoader";

function pathFor(hit: SearchHit): string | null {
  if (hit.kind === "player") return `/${hit.slug}`;
  if (hit.kind === "agency") return `/agency/${hit.slug}`;
  if (hit.kind === "manager" && hit.agencySlug) return `/agency/${hit.agencySlug}`;
  return null;
}

export default function SearchBar() {
  const [isOpenDesktop, setOpenDesktop] = React.useState(false);
  const [isOpenMobile, setOpenMobile] = React.useState(false);
  const [q, setQ] = React.useState("");

  const { results, loading } = usePlayerSearch(q);
  const router = useRouter();
  const pathname = usePathname();

  const [targetPath, setTargetPath] = React.useState<string | null>(null);
  const [showGlobalLoader, setShowGlobalLoader] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function handleSelect(hit: SearchHit) {
    const next = pathFor(hit);
    if (!next) return;
    setTargetPath(next);
    setShowGlobalLoader(true);
    setOpenDesktop(false);
    setOpenMobile(false);
    startTransition(() => router.push(next));
  }

  React.useEffect(() => {
    if (targetPath && pathname === targetPath) {
      setShowGlobalLoader(false);
      setTargetPath(null);
    }
  }, [pathname, targetPath]);

  function handleHoverHit(hit: SearchHit) {
    const next = pathFor(hit);
    if (next) router.prefetch(next);
  }

  return (
    <>
      {/* Triggers */}
      <div className="hidden md:block">
        <SearchTrigger onOpen={() => setOpenDesktop(true)} />
      </div>
      <div className="md:hidden">
        <TriggerMobile onOpen={() => setOpenMobile(true)} />
      </div>

      {/* Desktop modal */}
      <SearchModal
        isOpen={isOpenDesktop}
        onClose={() => setOpenDesktop(false)}
        q={q}
        setQ={setQ}
        results={results}
        loading={loading}
        onSelect={handleSelect}
        onHoverHit={handleHoverHit}
      />

      {/* Mobile modal */}
      <MobileModal
        isOpen={isOpenMobile}
        onClose={() => setOpenMobile(false)}
        q={q}
        setQ={setQ}
        results={results}
        loading={loading}
        onSelect={handleSelect}
        onHoverHit={handleHoverHit}
      />

      {/* Global transition loader */}
      <FullScreenLoader show={showGlobalLoader || isPending} text="Loading…" />
    </>
  );
}
