"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@heroui/react";

export type PendingCoachLicense = {
  id: string;
  title: string;
  issuer: string | null;
  awardedYear: number | null;
  expiresYear: number | null;
  docUrl: string | null;
  coachName: string;
  slug: string | null;
};

export default function CoachLicensesModerationPanel({
  items,
}: {
  items: PendingCoachLicense[];
}) {
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
      const res = await fetch(`/api/admin/coach-licenses/${id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reasons[id]?.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setPending((prev) => prev.filter((l) => l.id !== id));
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
          Moderación de licencias — DTs
        </h2>
        <p className="text-sm text-bh-fg-3">
          Verificá las titulaciones declaradas. Aprobar publica la credencial en la página del
          entrenador.
        </p>
      </div>

      {error && <p className="text-sm text-bh-danger">{error}</p>}

      {pending.length === 0 ? (
        <p className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-4">
          No hay licencias pendientes.
        </p>
      ) : (
        <div className="grid gap-4">
          {pending.map((l) => (
            <div key={l.id} className="grid gap-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="font-bh-display text-base font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                    {l.title}
                  </p>
                  <p className="text-[12px] text-bh-fg-3">
                    {l.issuer || "Sin emisor"}
                    {l.awardedYear ? ` · ${l.awardedYear}` : ""}
                    {l.expiresYear ? ` → ${l.expiresYear}` : ""}
                  </p>
                  <p className="text-[12px] text-bh-fg-4">
                    {l.coachName}
                    {l.slug && (
                      <>
                        {" · "}
                        <Link
                          href={`/coach/${l.slug}`}
                          target="_blank"
                          className="font-bh-mono hover:text-bh-lime"
                        >
                          /coach/{l.slug}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                {l.docUrl ? (
                  <a
                    href={l.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-bh-md border border-white/[0.12] px-3 py-1.5 text-[12px] text-bh-fg-2 hover:border-bh-lime hover:text-bh-lime"
                  >
                    Ver documento
                  </a>
                ) : (
                  <span className="text-[11px] text-bh-fg-4">Sin documento adjunto</span>
                )}
              </div>

              {showReject[l.id] && (
                <Textarea
                  label="Motivo del rechazo (opcional)"
                  value={reasons[l.id] ?? ""}
                  onValueChange={(v) => setReasons((p) => ({ ...p, [l.id]: v }))}
                  classNames={{ inputWrapper: "bg-bh-surface-2 border border-white/[0.08]" }}
                  minRows={2}
                />
              )}

              <div className="flex flex-wrap justify-end gap-2">
                {showReject[l.id] ? (
                  <>
                    <Button
                      variant="flat"
                      isDisabled={!!busy}
                      onPress={() => setShowReject((p) => ({ ...p, [l.id]: false }))}
                      className="rounded-bh-md border border-white/[0.08] bg-transparent px-3 py-2 text-[12px] text-bh-fg-3"
                    >
                      Cancelar
                    </Button>
                    <Button
                      isLoading={busy === l.id + "reject"}
                      isDisabled={!!busy}
                      onPress={() => moderate(l.id, "reject")}
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
                      onPress={() => setShowReject((p) => ({ ...p, [l.id]: true }))}
                      className="rounded-bh-md border border-white/[0.08] bg-transparent px-4 py-2 text-[12px] text-bh-fg-2 hover:border-bh-danger hover:text-bh-danger"
                    >
                      Rechazar
                    </Button>
                    <Button
                      isLoading={busy === l.id + "approve"}
                      isDisabled={!!busy}
                      onPress={() => moderate(l.id, "approve")}
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
