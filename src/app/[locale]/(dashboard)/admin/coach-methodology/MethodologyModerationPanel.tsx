"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@heroui/react";

export type PendingRubroDoc = { id: string; url: string; title: string | null; status: string };
export type PendingRubro = {
  id: string;
  title: string;
  icon: string | null;
  body: string | null;
  coachName: string;
  slug: string | null;
  docs: PendingRubroDoc[];
};

export default function MethodologyModerationPanel({ items }: { items: PendingRubro[] }) {
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
      const res = await fetch(`/api/admin/coach-methodology/${id}/moderate`, {
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
        No hay rubros de metodología pendientes de revisión.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-bh-danger">{error}</p>}
      {items.map((rubro) => (
        <article
          key={rubro.id}
          className="grid gap-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-bh-display text-lg font-bold text-bh-fg-1">{rubro.title}</h3>
              <p className="text-sm text-bh-fg-3">
                {rubro.coachName}
                {rubro.slug && (
                  <>
                    {" · "}
                    <a
                      href={`/staff/${rubro.slug}`}
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

          {rubro.body && (
            <p className="whitespace-pre-line rounded-bh-md border border-white/[0.06] bg-bh-surface-2/40 p-3 text-sm text-bh-fg-2">
              {rubro.body}
            </p>
          )}

          {rubro.docs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {rubro.docs.map((d) => (
                <a
                  key={d.id}
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-bh-md border border-white/[0.10] bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-bh-fg-2 hover:border-white/[0.24]"
                >
                  {d.title || "Documento"} ↗
                </a>
              ))}
            </div>
          )}

          <Textarea
            value={reasons[rubro.id] ?? ""}
            onValueChange={(v) => setReasons((p) => ({ ...p, [rubro.id]: v }))}
            placeholder="Motivo (requerido sólo si rechazás)"
            minRows={1}
            classNames={{ inputWrapper: "bg-bh-surface-2/40 border border-white/[0.10]" }}
          />

          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="flat"
              isDisabled={busy === rubro.id}
              onPress={() => moderate(rubro.id, "reject")}
              className="rounded-bh-md border border-white/[0.10] bg-transparent px-4 text-[13px] text-bh-fg-2 hover:border-bh-danger hover:text-bh-danger"
            >
              Rechazar
            </Button>
            <Button
              size="sm"
              isLoading={busy === rubro.id}
              onPress={() => moderate(rubro.id, "approve")}
              className="rounded-bh-md bg-bh-lime px-4 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]"
            >
              Aprobar
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
