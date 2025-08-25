"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import SearchTrigger from "./Trigger";            // desktop
import TriggerMobile from "./mobile/TriggerMobile";      // mobile
import SearchModal from "./SearchModal";          // desktop modal (ya lo tienes)
import MobileModal from "./mobile/MobileModal";          // nuevo
import { usePlayerSearch } from "./usePlayerSearch";
import FullScreenLoader from "@/components/ui/FullScreenLoader";

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

  function handleSelect(hit: { slug: string }) {
    const next = `/${hit.slug}`;
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

  function handleHoverSlug(slug: string) {
    router.prefetch(`/${slug}`);
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
        onHoverSlug={handleHoverSlug}
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
        onHoverSlug={handleHoverSlug}
      />

      {/* Global transition loader */}
      <FullScreenLoader show={showGlobalLoader || isPending} text="Loading player profile…" />
    </>
  );
}
