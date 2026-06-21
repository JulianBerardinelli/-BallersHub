"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import FormField from "@/components/dashboard/client/FormField";
import {
  upsertCoachLicense,
  deleteCoachLicense,
} from "@/app/actions/coach-licenses";

export type CoachLicenseRow = {
  id: string;
  title: string;
  issuer: string;
  awardedYear: number | null;
  expiresYear: number | null;
  docUrl: string | null;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
};

type DraftRow = {
  key: string;
  id: string | null;
  title: string;
  issuer: string;
  awardedYear: string;
  expiresYear: string;
  docUrl: string;
  status: "pending" | "approved" | "rejected" | "draft";
  rejectionReason: string | null;
};

const toDraft = (r: CoachLicenseRow): DraftRow => ({
  key: r.id,
  id: r.id,
  title: r.title,
  issuer: r.issuer,
  awardedYear: r.awardedYear != null ? String(r.awardedYear) : "",
  expiresYear: r.expiresYear != null ? String(r.expiresYear) : "",
  docUrl: r.docUrl ?? "",
  status: r.status,
  rejectionReason: r.rejectionReason,
});

const blankDraft = (): DraftRow => ({
  key: crypto.randomUUID(),
  id: null,
  title: "",
  issuer: "",
  awardedYear: "",
  expiresYear: "",
  docUrl: "",
  status: "draft",
  rejectionReason: null,
});

export default function CoachLicensesManager({ licenses }: { licenses: CoachLicenseRow[] }) {
  const router = useRouter();
  const [rows, setRows] = React.useState<DraftRow[]>(licenses.map(toDraft));

  function patch(key: string, p: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Licencias y certificaciones
        </h2>
        <p className="text-sm text-bh-fg-3">
          Cada licencia se publica recién cuando el equipo la verifica. Si editás una ya aprobada,
          vuelve a revisión.
        </p>
      </div>

      <div className="grid gap-4">
        {rows.map((row) => (
          <LicenseCard
            key={row.key}
            row={row}
            onPatch={(p) => patch(row.key, p)}
            onRemoveLocal={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
            onSaved={() => router.refresh()}
          />
        ))}
      </div>

      <Button
        variant="flat"
        onPress={() => setRows((prev) => [...prev, blankDraft()])}
        className="w-full rounded-bh-md border border-dashed border-white/[0.12] bg-transparent py-2 text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:border-white/[0.24] hover:text-bh-fg-1"
      >
        + Agregar licencia
      </Button>
    </div>
  );
}

function LicenseCard({
  row,
  onPatch,
  onRemoveLocal,
  onSaved,
}: {
  row: DraftRow;
  onPatch: (p: Partial<DraftRow>) => void;
  onRemoveLocal: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function onPickDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/coach/license-doc/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "No se pudo subir el archivo.");
      onPatch({ docUrl: json.url });
      setMsg({ ok: true, text: "Documento subido. Guardá para enviarlo a revisión." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Error al subir." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSave() {
    setSaving(true);
    setMsg(null);
    const res = await upsertCoachLicense({
      id: row.id ?? undefined,
      title: row.title,
      issuer: row.issuer || null,
      awardedYear: row.awardedYear.trim() ? Number(row.awardedYear) : null,
      expiresYear: row.expiresYear.trim() ? Number(row.expiresYear) : null,
      docUrl: row.docUrl.trim() || null,
    });
    setSaving(false);
    if (res.success) {
      setMsg({ ok: true, text: "Guardada. Queda en revisión hasta que el equipo la apruebe." });
      onSaved();
    } else {
      setMsg({ ok: false, text: res.message ?? "No se pudo guardar." });
    }
  }

  async function onDelete() {
    if (!row.id) {
      onRemoveLocal();
      return;
    }
    setSaving(true);
    const res = await deleteCoachLicense(row.id);
    setSaving(false);
    if (res.success) {
      onSaved();
    } else {
      setMsg({ ok: false, text: res.message ?? "No se pudo eliminar." });
    }
  }

  return (
    <div className="grid gap-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
      <div className="flex items-center justify-between">
        <StatusChip status={row.status} />
        <Button
          size="sm"
          variant="flat"
          isDisabled={saving}
          onPress={onDelete}
          className="h-7 rounded-bh-md border border-white/[0.08] bg-transparent px-3 text-[12px] text-bh-fg-3 hover:border-bh-danger hover:text-bh-danger"
        >
          Eliminar
        </Button>
      </div>

      {row.status === "rejected" && row.rejectionReason && (
        <p className="rounded-bh-md border border-bh-danger/25 bg-bh-danger/5 p-2 text-[12px] text-bh-fg-2">
          <span className="font-semibold text-bh-danger">Motivo del rechazo: </span>
          {row.rejectionReason}
        </p>
      )}

      <div className="grid auto-rows-fr gap-3 grid-cols-1 sm:grid-cols-2">
        <FormField
          id={`lic-title-${row.key}`}
          isRequired
          label="Licencia"
          placeholder="Ej: UEFA Pro Licence"
          value={row.title}
          onChange={(e) => onPatch({ title: e.target.value })}
        />
        <FormField
          id={`lic-issuer-${row.key}`}
          label="Emisor"
          placeholder="Ej: UEFA, AFA, CONMEBOL"
          value={row.issuer}
          onChange={(e) => onPatch({ issuer: e.target.value })}
        />
      </div>
      <div className="grid auto-rows-fr gap-3 grid-cols-1 sm:grid-cols-2">
        <FormField
          id={`lic-awarded-${row.key}`}
          type="number"
          label="Año de obtención"
          placeholder="2021"
          value={row.awardedYear}
          onChange={(e) => onPatch({ awardedYear: e.target.value })}
        />
        <FormField
          id={`lic-expires-${row.key}`}
          type="number"
          label="Año de vencimiento (opcional)"
          placeholder="2026"
          value={row.expiresYear}
          onChange={(e) => onPatch({ expiresYear: e.target.value })}
        />
      </div>

      {/* Documento de respaldo: PDF/imagen (modal) o link externo (_blank). */}
      <div className="grid gap-2 rounded-bh-md border border-white/[0.06] bg-bh-surface-2/40 p-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-bh-fg-4">
          Documento o link de verificación (opcional)
        </p>
        <FormField
          id={`lic-doc-${row.key}`}
          label=""
          placeholder="https://… (link al certificado o página de verificación)"
          value={row.docUrl}
          onChange={(e) => onPatch({ docUrl: e.target.value })}
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={onPickDoc}
          />
          <Button
            size="sm"
            variant="flat"
            isDisabled={uploading || saving}
            isLoading={uploading}
            onPress={() => fileRef.current?.click()}
            className="h-8 rounded-bh-md border border-white/[0.12] bg-transparent px-3 text-[12px] text-bh-fg-2 hover:border-white/[0.24]"
          >
            Subir PDF o imagen
          </Button>
          {row.docUrl.trim() && (
            <>
              <a
                href={row.docUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] text-bh-lime hover:underline"
              >
                Ver documento ↗
              </a>
              <button
                type="button"
                onClick={() => onPatch({ docUrl: "" })}
                className="text-[12px] text-bh-fg-4 hover:text-bh-danger"
              >
                Quitar
              </button>
            </>
          )}
        </div>
      </div>

      {msg && (
        <p className={`text-[12px] ${msg.ok ? "text-bh-success" : "text-bh-danger"}`}>{msg.text}</p>
      )}

      <div className="flex justify-end">
        <Button
          onPress={onSave}
          isLoading={saving}
          isDisabled={saving || row.title.trim().length < 2}
          className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]"
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: DraftRow["status"] }) {
  const map: Record<DraftRow["status"], { label: string; cls: string }> = {
    draft: { label: "Sin guardar", cls: "border-white/[0.12] bg-white/[0.06] text-bh-fg-3" },
    pending: { label: "En revisión", cls: "border-bh-warning/25 bg-bh-warning/10 text-bh-warning" },
    approved: { label: "Publicada", cls: "border-bh-success/25 bg-bh-success/10 text-bh-success" },
    rejected: { label: "Rechazada", cls: "border-bh-danger/25 bg-bh-danger/10 text-bh-danger" },
  };
  const { label, cls } = map[status];
  return (
    <span
      className={`inline-flex items-center rounded-bh-pill border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${cls}`}
    >
      {label}
    </span>
  );
}
