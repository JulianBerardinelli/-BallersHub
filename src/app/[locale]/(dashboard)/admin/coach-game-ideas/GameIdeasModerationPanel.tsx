"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@heroui/react";
import PitchBoard from "@/components/coach/pitch/PitchBoard";
import { parsePitchBoard } from "@/lib/coach/game-ideas";

export type PendingGameIdea = {
  id: string;
  title: string | null;
  formation: string | null;
  blurb: string | null;
  link: string | null;
  board: unknown;
  coachName: string;
  slug: string | null;
};

export default function GameIdeasModerationPanel({ items }: { items: PendingGameIdea[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [reasons, setReasons] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);

  async function moderate(id: string, action: "approve" | "reject") {
    setError(null);
    if (action === "reject" && !reasons[id]?.trim()) {
      setError("Indicá un motivo para rechazar.");
      return;
    }
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/coach-game-ideas/${id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reasons[id] ?? null }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "No se pudo moderar.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-3">
        No hay ideas de juego pendientes de revisión.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-bh-danger">{error}</p>}
      {items.map((idea) => (
        <article
          key={idea.id}
          className="grid gap-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5 md:grid-cols-[220px_1fr]"
        >
          <div className="mx-auto w-full max-w-[200px]">
            <PitchBoard board={parsePitchBoard(idea.board)} tokenSize={20} />
          </div>

          <div className="grid content-start gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bh-display text-lg font-bold text-bh-fg-1">
                  {idea.title?.trim() || "Idea de juego"}
                  {idea.formation?.trim() && (
                    <span className="ml-2 font-bh-mono text-sm text-bh-fg-3">{idea.formation}</span>
                  )}
                </h3>
                <p className="text-sm text-bh-fg-3">
                  {idea.coachName}
                  {idea.slug && (
                    <>
                      {" · "}
                      <a
                        href={`/staff/${idea.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-bh-lime hover:underline"
                      >
                        ver perfil ↗
                      </a>
                    </>
                  )}
                </p>
              </div>
            </div>

            {idea.blurb && (
              <p className="whitespace-pre-line rounded-bh-md border border-white/[0.06] bg-bh-surface-2/40 p-3 text-sm text-bh-fg-2">
                {idea.blurb}
              </p>
            )}

            {idea.link && (
              <a
                href={idea.link}
                target="_blank"
                rel="noreferrer"
                className="w-fit text-[12px] text-bh-lime hover:underline"
              >
                {idea.link} ↗
              </a>
            )}

            <Textarea
              value={reasons[idea.id] ?? ""}
              onValueChange={(v) => setReasons((p) => ({ ...p, [idea.id]: v }))}
              placeholder="Motivo (requerido sólo si rechazás)"
              minRows={1}
              classNames={{ inputWrapper: "bg-bh-surface-2/40 border border-white/[0.10]" }}
            />

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="flat"
                isDisabled={busy === idea.id}
                onPress={() => moderate(idea.id, "reject")}
                className="rounded-bh-md border border-white/[0.10] bg-transparent px-4 text-[13px] text-bh-fg-2 hover:border-bh-danger hover:text-bh-danger"
              >
                Rechazar
              </Button>
              <Button
                size="sm"
                isLoading={busy === idea.id}
                onPress={() => moderate(idea.id, "approve")}
                className="rounded-bh-md bg-bh-lime px-4 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]"
              >
                Aprobar
              </Button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
