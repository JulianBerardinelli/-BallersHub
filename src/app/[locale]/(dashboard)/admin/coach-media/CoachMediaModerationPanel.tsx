"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@heroui/react";

export type PendingCoachMedia = {
  id: string;
  type: "photo" | "video" | "doc";
  url: string;
  title: string | null;
  seasonYear: number | null;
  coachName: string;
  slug: string | null;
};

export default function CoachMediaModerationPanel({ items }: { items: PendingCoachMedia[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(items);
  const [reasons, setReasons] = React.useState<Record<string, string>>({});
  const [showReject, setShowReject] = React.useState<Record<string, boolean>>({});
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function moderate(id: string, action: "approve" | "reject") {
    setBusy(id + action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/coach-media/${id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reasons[id]?.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setPending((prev) => prev.filter((m) => m.id !== id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Moderación multimedia — DTs
        </h2>
        <p className="text-sm text-bh-fg-3">
          Fotos y videos pendientes. Aprobar publica el archivo en la página del entrenador.
        </p>
      </div>

      {error && <p className="text-sm text-bh-danger">{error}</p>}

      {pending.length === 0 ? (
        <p className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-4">
          No hay multimedia pendiente.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pending.map((m) => (
            <div key={m.id} className="grid gap-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-4">
              <div className="relative aspect-video overflow-hidden rounded-bh-sm border border-white/[0.06] bg-bh-surface-2">
                {m.type === "photo" ? (
                  <Image
                    src={m.url}
                    alt={m.title ?? "Foto del entrenador"}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex size-full items-center justify-center text-[12px] text-bh-fg-3 hover:text-bh-lime"
                  >
                    ▶ Ver video
                  </a>
                )}
              </div>

              <div className="space-y-0.5">
                <p className="text-[13px] font-semibold text-bh-fg-1">{m.coachName}</p>
                {m.slug && (
                  <Link
                    href={`/coach/${m.slug}`}
                    target="_blank"
                    className="font-bh-mono text-[11px] text-bh-fg-4 hover:text-bh-lime"
                  >
                    /coach/{m.slug}
                  </Link>
                )}
                {m.title && <p className="text-[12px] text-bh-fg-3">{m.title}</p>}
                <p className="text-[11px] uppercase tracking-[0.08em] text-bh-fg-4">
                  {m.type}
                  {m.seasonYear ? ` · ${m.seasonYear}` : ""}
                </p>
              </div>

              {showReject[m.id] && (
                <Textarea
                  label="Motivo del rechazo (opcional)"
                  value={reasons[m.id] ?? ""}
                  onValueChange={(v) => setReasons((p) => ({ ...p, [m.id]: v }))}
                  classNames={{ inputWrapper: "bg-bh-surface-2 border border-white/[0.08]" }}
                  minRows={2}
                />
              )}

              <div className="flex flex-wrap justify-end gap-2">
                {showReject[m.id] ? (
                  <>
                    <Button
                      variant="flat"
                      isDisabled={!!busy}
                      onPress={() => setShowReject((p) => ({ ...p, [m.id]: false }))}
                      className="rounded-bh-md border border-white/[0.08] bg-transparent px-3 py-2 text-[12px] text-bh-fg-3"
                    >
                      Cancelar
                    </Button>
                    <Button
                      isLoading={busy === m.id + "reject"}
                      isDisabled={!!busy}
                      onPress={() => moderate(m.id, "reject")}
                      className="rounded-bh-md bg-bh-danger px-4 py-2 text-[12px] font-semibold text-white"
                    >
                      Confirmar rechazo
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="flat"
                      isDisabled={!!busy}
                      onPress={() => setShowReject((p) => ({ ...p, [m.id]: true }))}
                      className="rounded-bh-md border border-white/[0.08] bg-transparent px-4 py-2 text-[12px] text-bh-fg-2 hover:border-bh-danger hover:text-bh-danger"
                    >
                      Rechazar
                    </Button>
                    <Button
                      isLoading={busy === m.id + "approve"}
                      isDisabled={!!busy}
                      onPress={() => moderate(m.id, "approve")}
                      className="rounded-bh-md bg-bh-lime px-5 py-2 text-[12px] font-semibold text-bh-black hover:bg-[#d8ff26]"
                    >
                      Aprobar
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
