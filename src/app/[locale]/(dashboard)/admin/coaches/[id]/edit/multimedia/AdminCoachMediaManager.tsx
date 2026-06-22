"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { adminSetCoachMediaStatus, adminDeleteCoachMedia } from "@/app/actions/admin-coach";

export type AdminCoachMediaRow = {
  id: string;
  type: "photo" | "video" | "doc";
  url: string;
  title: string | null;
  status: "pending" | "approved" | "rejected";
  seasonYear: number | null;
};

const statusMeta: Record<AdminCoachMediaRow["status"], { label: string; cls: string }> = {
  pending: { label: "En revisión", cls: "border-bh-warning/25 bg-bh-warning/10 text-bh-warning" },
  approved: { label: "Publicada", cls: "border-bh-success/25 bg-bh-success/10 text-bh-success" },
  rejected: { label: "Rechazada", cls: "border-bh-danger/25 bg-bh-danger/10 text-bh-danger" },
};

export default function AdminCoachMediaManager({ items }: { items: AdminCoachMediaRow[] }) {
  const router = useRouter();
  const [rows, setRows] = React.useState(items);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function setStatus(id: string, status: "approved" | "rejected") {
    setBusy(id);
    setError(null);
    const res = await adminSetCoachMediaStatus(id, status);
    setBusy(null);
    if (res.success) {
      setRows((p) => p.map((m) => (m.id === id ? { ...m, status } : m)));
      router.refresh();
    } else setError(res.message ?? "Error.");
  }

  async function remove(id: string) {
    setBusy(id);
    setError(null);
    const res = await adminDeleteCoachMedia(id);
    setBusy(null);
    if (res.success) {
      setRows((p) => p.filter((m) => m.id !== id));
      router.refresh();
    } else setError(res.message ?? "Error.");
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-4">
        Este entrenador todavía no cargó multimedia.
      </p>
    );
  }

  return (
    <>
      {error && <p className="mb-3 text-sm text-bh-danger">{error}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rows.map((m) => (
          <div key={m.id} className="grid gap-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-4">
            <div className="relative aspect-video overflow-hidden rounded-bh-sm border border-white/[0.06] bg-bh-surface-2">
              {m.type === "photo" ? (
                <Image src={m.url} alt={m.title ?? "Foto"} fill sizes="(max-width:768px) 100vw, 400px" className="object-cover" unoptimized />
              ) : (
                <a href={m.url} target="_blank" rel="noreferrer" className="flex size-full items-center justify-center text-[12px] text-bh-fg-3 hover:text-bh-lime">
                  ▶ Ver video
                </a>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center rounded-bh-pill border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusMeta[m.status].cls}`}>
                {statusMeta[m.status].label}
              </span>
              <span className="text-[11px] uppercase tracking-[0.08em] text-bh-fg-4">
                {m.type}{m.seasonYear ? ` · ${m.seasonYear}` : ""}
              </span>
            </div>
            {m.title && <p className="text-[12px] text-bh-fg-3">{m.title}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              {m.status !== "approved" && (
                <Button size="sm" isDisabled={!!busy} isLoading={busy === m.id} onPress={() => setStatus(m.id, "approved")} className="rounded-bh-md bg-bh-lime px-3 py-1.5 text-[12px] font-semibold text-bh-black">
                  Aprobar
                </Button>
              )}
              {m.status !== "rejected" && (
                <Button size="sm" variant="flat" isDisabled={!!busy} onPress={() => setStatus(m.id, "rejected")} className="rounded-bh-md border border-white/[0.08] bg-transparent px-3 py-1.5 text-[12px] text-bh-fg-2 hover:border-bh-danger hover:text-bh-danger">
                  Rechazar
                </Button>
              )}
              <Button size="sm" variant="flat" isDisabled={!!busy} onPress={() => remove(m.id)} className="rounded-bh-md border border-white/[0.08] bg-transparent px-3 py-1.5 text-[12px] text-bh-fg-3 hover:border-bh-danger hover:text-bh-danger">
                Eliminar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
