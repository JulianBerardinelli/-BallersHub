"use client";

import { useEffect, useState } from "react";

/**
 * Optimistic up/down reordering backed by a PATCH endpoint that accepts
 * `{ ids: string[] }` (the full ordered list). Used by the press-notes list
 * and the video-highlights grid in the multimedia dashboard.
 *
 * Local order is the source of truth while mounted: a successful move is
 * shown instantly and persisted in the background. When the `items` prop
 * changes (an add, delete, or edit that triggered a router.refresh()) we
 * reconcile WITHOUT clobbering the current manual order:
 *   - ids still present keep their current position but pick up refreshed
 *     field data, so an edited title/url shows immediately;
 *   - newly added ids are appended at the end (mirrors the server's max+1);
 *   - removed ids are dropped.
 * A pure reorder never mutates `items`, so it never triggers this effect and
 * the optimistic order stays put.
 */
export function useReorderable<T extends { id: string }>(items: T[], endpoint: string) {
  const [ordered, setOrdered] = useState<T[]>(items);
  const [isSaving, setIsSaving] = useState(false);

  // Re-run whenever the items payload changes by id OR by content. A pure
  // reorder leaves `items` untouched, so the optimistic order is preserved.
  const itemsKey = JSON.stringify(items);
  useEffect(() => {
    setOrdered((prev) => {
      const byId = new Map(items.map((it) => [it.id, it] as const));
      // Keep the current manual order for surviving ids, refreshing their data.
      const kept = prev
        .filter((it) => byId.has(it.id))
        .map((it) => byId.get(it.id) as T);
      // Append any newly added ids (in incoming order) at the end.
      const keptIds = new Set(kept.map((it) => it.id));
      const added = items.filter((it) => !keptIds.has(it.id));
      return [...kept, ...added];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

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
