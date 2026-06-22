"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { adminSetCoachStatus } from "@/app/actions/admin-coach";

const INPUT =
  "w-full rounded-bh-md border border-white/[0.10] bg-bh-surface-2 px-3 py-2 text-[14px] text-bh-fg-1 outline-none focus:border-bh-lime/50";

// Admin-only meta the owner editor doesn't expose: moderation status + visibility.
export default function AdminCoachStatusCard({
  coachId,
  status: initialStatus,
  visibility: initialVisibility,
}: {
  coachId: string;
  status: "draft" | "pending_review" | "approved" | "rejected";
  visibility: "public" | "private";
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState(initialStatus);
  const [visibility, setVisibility] = React.useState(initialVisibility);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  async function onSave() {
    setSaving(true);
    setMsg(null);
    const res = await adminSetCoachStatus(coachId, status, visibility);
    setSaving(false);
    if (res.success) {
      setMsg({ ok: true, text: "Estado actualizado." });
      router.refresh();
    } else {
      setMsg({ ok: false, text: res.message ?? "No se pudo guardar." });
    }
  }

  return (
    <div className="grid gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
      <h3 className="font-bh-display text-sm font-bold uppercase tracking-[0.04em] text-bh-fg-2">
        Estado del perfil (admin)
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block font-body text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
            Estado
          </label>
          <select className={INPUT} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="approved">Aprobado</option>
            <option value="pending_review">En revisión</option>
            <option value="rejected">Rechazado</option>
            <option value="draft">Borrador</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block font-body text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
            Visibilidad
          </label>
          <select
            className={INPUT}
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as typeof visibility)}
          >
            <option value="public">Pública</option>
            <option value="private">Privada</option>
          </select>
        </div>
      </div>
      {msg && <p className={`text-[13px] ${msg.ok ? "text-bh-success" : "text-bh-danger"}`}>{msg.text}</p>}
      <div className="flex justify-end">
        <Button
          onPress={onSave}
          isLoading={saving}
          isDisabled={saving}
          className="rounded-bh-md border border-white/[0.12] bg-transparent px-5 py-2 text-[13px] font-medium text-bh-fg-1 hover:border-white/[0.24]"
        >
          Guardar estado
        </Button>
      </div>
    </div>
  );
}
