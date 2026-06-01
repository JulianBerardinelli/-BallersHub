"use client";

import { useEffect, useState } from "react";

/**
 * Optimistic up/down reordering backed by a PATCH endpoint that accepts
 * `{ ids: string[] }` (the full ordered list). Used by the press-notes list
 * and the video-highlights grid in the multimedia dashboard.
 *
 * Local order is the source of truth while mounted: a successful move is
 * shown instantly and persisted in the background. The list only re-seeds
 * from props when the SET of ids changes (an add or delete), so a
 * router.refresh() after those operations syncs cleanly without clobbering
 * an in-progress manual order.
 */
export function useReorderable<T extends { id: string }>(items: T[], endpoint: string) {
  const [ordered, setOrdered] = useState<T[]>(items);
  const [isSaving, setIsSaving] = useState(false);

  // Re-seed only when the id set changes (add/delete). A pure reorder keeps
  // the same set, so the effect is a no-op and the optimistic order stays.
  const idSetKey = items
    .map((i) => i.id)
    .slice()
    .sort()
    .join(",");
  useEffect(() => {
    setOrdered(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSetKey]);

  const persist = async (next: T[], prev: T[]) => {
    setIsSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((i) => i.id) }),
      });
      if (!res.ok) throw new Error("reorder failed");
    } catch (err) {
      console.error(err);
      setOrdered(prev); // revert optimistic move
      alert("No se pudo guardar el nuevo orden. Intentá de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  const move = (id: string, dir: -1 | 1) => {
    if (isSaving) return;
    const idx = ordered.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= ordered.length) return;
    const prev = ordered;
    const next = ordered.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrdered(next);
    void persist(next, prev);
  };

  return {
    ordered,
    isSaving,
    moveUp: (id: string) => move(id, -1),
    moveDown: (id: string) => move(id, 1),
  };
}
