"use client";

// Approve / Reject form rendered on /admin/blog/[id].
// Client component because we need a textarea + form submission for
// rejection with a feedback message.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewPost, unpublishPost, deletePost } from "@/app/[locale]/(dashboard)/admin/blog/actions";
import type { BlogStatus } from "@/db/schema";

type Props = {
  postId: string;
  currentStatus: BlogStatus;
};

export function AdminReviewActions({ postId, currentStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (work: () => Promise<{ success: boolean; message?: string }>) => {
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      const result = await work();
      if (result.success) {
        setFeedback(result.message ?? "Hecho.");
        router.refresh();
      } else {
        setError(result.message ?? "Algo falló.");
      }
    });
  };

  return (
    <div className="space-y-4 rounded-bh-lg border border-bh-fg-4 bg-bh-surface-1 p-5">
      <h2 className="font-bh-display text-base font-bold uppercase tracking-tight text-bh-fg-1">
        Acciones de admin
      </h2>

      {currentStatus === "pending_review" && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => run(() => reviewPost({ id: postId, decision: "approve" }))}
            disabled={isPending}
            className="w-full rounded-bh-md bg-bh-lime px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-bh-black hover:opacity-90 disabled:opacity-50"
          >
            Aprobar y publicar
          </button>

          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2">
              Feedback para el autor (rechazo)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Buen ángulo del tema, pero faltan 3 cosas: 1) ..."
              className="w-full rounded-bh-md border border-bh-fg-4 bg-bh-surface-2 px-3 py-2 text-sm text-bh-fg-1 focus:border-bh-lime focus:outline-none"
            />
            <p className="text-[11px] text-bh-fg-3">
              Mínimo 20 caracteres. El feedback es lo único que el autor
              va a ver al recibir el rechazo — sé específico.
            </p>
            <button
              type="button"
              onClick={() => {
                if (reason.trim().length < 20) {
                  setError(
                    "El feedback debe tener al menos 20 caracteres. Sé específico para que el autor sepa qué cambiar.",
                  );
                  return;
                }
                run(() =>
                  reviewPost({
                    id: postId,
                    decision: "reject",
                    rejectionReason: reason,
                  }),
                );
              }}
              disabled={isPending}
              className="w-full rounded-bh-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-red-200 hover:bg-red-500/20 disabled:opacity-50"
            >
              Rechazar con feedback
            </button>
          </div>
        </div>
      )}

      {currentStatus === "published" && (
        <button
          type="button"
          onClick={() => run(() => unpublishPost(postId))}
          disabled={isPending}
          className="w-full rounded-bh-md border border-bh-fg-4 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-bh-fg-2 hover:border-bh-fg-3 hover:text-bh-fg-1 disabled:opacity-50"
        >
          Despublicar (vuelve a draft)
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          if (!window.confirm("¿Borrar el post permanentemente? Esto no se puede deshacer.")) return;
          run(() => deletePost(postId));
        }}
        disabled={isPending}
        className="w-full rounded-bh-md border border-red-500/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-red-300 hover:bg-red-500/10 disabled:opacity-50"
      >
        Borrar permanentemente
      </button>

      {feedback && <p className="text-sm font-semibold text-bh-lime">{feedback}</p>}
      {error && <p className="text-sm font-semibold text-red-300">{error}</p>}
    </div>
  );
}
