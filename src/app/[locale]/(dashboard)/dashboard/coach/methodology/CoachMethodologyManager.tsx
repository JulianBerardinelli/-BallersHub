"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@heroui/react";
import FormField from "@/components/dashboard/client/FormField";
import {
  upsertMethodologyRubro,
  deleteMethodologyRubro,
  removeMethodologyDoc,
  type MethodologyActionResult,
  type MethodologyRubroInput,
} from "@/app/actions/coach-methodology";
import {
  FREE_RUBRO_CAP,
  type MethodologyRubroForEditor,
  type MethodologyDocForEditor,
} from "@/lib/coach/methodology-data";
import { METHODOLOGY_ICONS, METHODOLOGY_ICON_KEYS } from "@/lib/staff/methodology-icons";

type DocDraft = MethodologyDocForEditor;

type DraftRow = {
  key: string;
  id: string | null;
  title: string;
  icon: string | null;
  body: string;
  status: "pending" | "approved" | "rejected" | "draft";
  rejectionReason: string | null;
  docs: DocDraft[];
};

const toDraft = (r: MethodologyRubroForEditor): DraftRow => ({
  key: r.id,
  id: r.id,
  title: r.title,
  icon: r.icon,
  body: r.body ?? "",
  status: (r.status as DraftRow["status"]) ?? "pending",
  rejectionReason: r.rejectionReason,
  docs: r.docs,
});

const blankDraft = (): DraftRow => ({
  key: crypto.randomUUID(),
  id: null,
  title: "",
  icon: "target",
  body: "",
  status: "draft",
  rejectionReason: null,
  docs: [],
});

export default function CoachMethodologyManager({
  rubros,
  isPro,
  upsertAction = upsertMethodologyRubro,
  deleteAction = deleteMethodologyRubro,
  removeDocAction = removeMethodologyDoc,
  uploadUrl = "/api/coach/methodology-doc/upload",
  liveMode = false,
}: {
  rubros: MethodologyRubroForEditor[];
  isPro: boolean;
  upsertAction?: (input: MethodologyRubroInput) => Promise<MethodologyActionResult>;
  deleteAction?: (id: string) => Promise<MethodologyActionResult>;
  removeDocAction?: (docId: string) => Promise<MethodologyActionResult>;
  uploadUrl?: string;
  liveMode?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = React.useState<DraftRow[]>(rubros.map(toDraft));

  function patch(key: string, p: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }

  const atCap = !isPro && rows.length >= FREE_RUBRO_CAP;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Metodología
        </h2>
        <p className="text-sm text-bh-fg-3">
          {liveMode
            ? "Edición directa: lo que guardás se publica al instante."
            : "Armá tu metodología de trabajo en rubros (título + texto). Cada rubro se publica recién cuando el equipo lo aprueba; si editás uno aprobado, vuelve a revisión."}
        </p>
        {!isPro && (
          <p className="text-[12px] text-bh-fg-4">
            Plan Free: hasta {FREE_RUBRO_CAP} rubros de texto. Pro: rubros ilimitados + adjuntos PDF/PPT.
          </p>
        )}
      </div>

      <div className="grid gap-4">
        {rows.map((row) => (
          <RubroCard
            key={row.key}
            row={row}
            isPro={isPro}
            liveMode={liveMode}
            upsertAction={upsertAction}
            deleteAction={deleteAction}
            removeDocAction={removeDocAction}
            uploadUrl={uploadUrl}
            onPatch={(p) => patch(row.key, p)}
            onRemoveLocal={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
            onSaved={() => router.refresh()}
          />
        ))}
      </div>

      <Button
        variant="flat"
        isDisabled={atCap}
        onPress={() => setRows((prev) => [...prev, blankDraft()])}
        className="w-full rounded-bh-md border border-dashed border-white/[0.12] bg-transparent py-2 text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:border-white/[0.24] hover:text-bh-fg-1 data-[disabled=true]:opacity-40"
      >
        + Agregar rubro
      </Button>
      {atCap && (
        <p className="-mt-3 text-[12px] text-bh-fg-4">
          Llegaste al límite Free de {FREE_RUBRO_CAP} rubros.{" "}
          <Link href="/checkout/pro-coach?currency=ARS" className="text-bh-lime hover:underline">
            Activá Pro
          </Link>{" "}
          para sumar más y adjuntar archivos.
        </p>
      )}
    </div>
  );
}

function RubroCard({
  row,
  isPro,
  liveMode,
  upsertAction,
  deleteAction,
  removeDocAction,
  uploadUrl,
  onPatch,
  onRemoveLocal,
  onSaved,
}: {
  row: DraftRow;
  isPro: boolean;
  liveMode: boolean;
  upsertAction: (input: MethodologyRubroInput) => Promise<MethodologyActionResult>;
  deleteAction: (id: string) => Promise<MethodologyActionResult>;
  removeDocAction: (docId: string) => Promise<MethodologyActionResult>;
  uploadUrl: string;
  onPatch: (p: Partial<DraftRow>) => void;
  onRemoveLocal: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function onSave() {
    setSaving(true);
    setMsg(null);
    const res = await upsertAction({
      id: row.id ?? undefined,
      title: row.title,
      icon: row.icon,
      body: row.body.trim() || null,
    });
    setSaving(false);
    if (res.success) {
      // Setear el id (rubro nuevo) habilita la subida de archivos sin refresh.
      if (res.id && !row.id) onPatch({ id: res.id, status: liveMode ? "approved" : "pending" });
      else onPatch({ status: liveMode ? "approved" : "pending" });
      setMsg({
        ok: true,
        text: liveMode ? "Guardado. Publicado al instante." : "Guardado. Queda en revisión.",
      });
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
    const res = await deleteAction(row.id);
    setSaving(false);
    if (res.success) onSaved();
    else setMsg({ ok: false, text: res.message ?? "No se pudo eliminar." });
  }

  async function onPickDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !row.id) return;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("rubroId", row.id);
      fd.append("file", file);
      const res = await fetch(uploadUrl, { method: "POST", body: fd });
      const json = (await res.json()) as { id?: string; url?: string; error?: string };
      if (!res.ok || !json.id || !json.url) throw new Error(json.error ?? "No se pudo subir el archivo.");
      const mime = /\.pptx?($|\?)/i.test(json.url) ? (/\.pptx/i.test(json.url) ? "pptx" : "ppt") : "pdf";
      onPatch({
        docs: [
          ...row.docs,
          { id: json.id, url: json.url, title: file.name.replace(/\.[^.]+$/, ""), status: "pending", mime: mime as DocDraft["mime"] },
        ],
      });
      setMsg({ ok: true, text: "Archivo subido. Queda en revisión." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Error al subir." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onRemoveDoc(docId: string) {
    const res = await removeDocAction(docId);
    if (res.success) onPatch({ docs: row.docs.filter((d) => d.id !== docId) });
    else setMsg({ ok: false, text: res.message ?? "No se pudo quitar el archivo." });
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

      <FormField
        id={`rubro-title-${row.key}`}
        isRequired
        label="Título del rubro"
        placeholder="Ej: Planificación de cargas, Filosofía defensiva, Captación…"
        value={row.title}
        onChange={(e) => onPatch({ title: e.target.value })}
      />

      <IconPicker value={row.icon} onChange={(icon) => onPatch({ icon })} fieldKey={row.key} />

      <div>
        <label
          htmlFor={`rubro-body-${row.key}`}
          className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.1em] text-bh-fg-4"
        >
          Descripción
        </label>
        <textarea
          id={`rubro-body-${row.key}`}
          rows={4}
          value={row.body}
          onChange={(e) => onPatch({ body: e.target.value })}
          placeholder="Explicá este rubro de tu metodología…"
          className="w-full rounded-bh-md border border-white/[0.10] bg-bh-surface-2/40 p-3 text-sm text-bh-fg-1 outline-none placeholder:text-bh-fg-4 focus:border-bh-lime/40"
        />
      </div>

      {/* Adjuntos PDF/PPT — sólo Pro y sólo cuando el rubro ya existe (tiene id). */}
      <div className="grid gap-2 rounded-bh-md border border-white/[0.06] bg-bh-surface-2/40 p-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-bh-fg-4">
          Archivos (PDF / PPT){!isPro && " · Pro"}
        </p>
        {row.docs.length > 0 && (
          <ul className="grid gap-1.5">
            {row.docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 rounded-bh-md border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5"
              >
                <span className="flex min-w-0 items-center gap-2 text-[12px] text-bh-fg-2">
                  <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-bh-fg-3">
                    {d.mime}
                  </span>
                  <a href={d.url} target="_blank" rel="noreferrer" className="truncate hover:underline">
                    {d.title || "Documento"}
                  </a>
                  <StatusDot status={d.status} />
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveDoc(d.id)}
                  className="shrink-0 text-[12px] text-bh-fg-4 hover:text-bh-danger"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
        {isPro ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="hidden"
              onChange={onPickDoc}
            />
            <Button
              size="sm"
              variant="flat"
              isDisabled={uploading || saving || !row.id}
              isLoading={uploading}
              onPress={() => fileRef.current?.click()}
              className="h-8 rounded-bh-md border border-white/[0.12] bg-transparent px-3 text-[12px] text-bh-fg-2 hover:border-white/[0.24] data-[disabled=true]:opacity-40"
            >
              Subir PDF/PPT
            </Button>
            {!row.id && <span className="text-[11px] text-bh-fg-4">Guardá el rubro para adjuntar archivos.</span>}
          </div>
        ) : (
          <p className="text-[11px] text-bh-fg-4">
            Los archivos son una función Pro.{" "}
            <Link href="/checkout/pro-coach?currency=ARS" className="text-bh-lime hover:underline">
              Activá Pro
            </Link>
            .
          </p>
        )}
      </div>

      {msg && <p className={`text-[12px] ${msg.ok ? "text-bh-success" : "text-bh-danger"}`}>{msg.text}</p>}

      <div className="flex justify-end">
        <Button
          onPress={onSave}
          isLoading={saving}
          isDisabled={saving || row.title.trim().length < 1}
          className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]"
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}

function IconPicker({
  value,
  onChange,
  fieldKey,
}: {
  value: string | null;
  onChange: (icon: string) => void;
  fieldKey: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-bh-fg-4">Ícono</p>
      <div className="flex flex-wrap gap-1.5">
        {METHODOLOGY_ICON_KEYS.map((key) => {
          const Icon = METHODOLOGY_ICONS[key];
          const active = value === key;
          return (
            <button
              key={`${fieldKey}-${key}`}
              type="button"
              aria-label={key}
              aria-pressed={active}
              onClick={() => onChange(key)}
              className={`flex h-9 w-9 items-center justify-center rounded-bh-md border transition-colors ${
                active
                  ? "border-bh-lime/60 bg-bh-lime/10 text-bh-lime"
                  : "border-white/[0.10] bg-transparent text-bh-fg-3 hover:border-white/[0.24] hover:text-bh-fg-1"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: DraftRow["status"] }) {
  const map: Record<DraftRow["status"], { label: string; cls: string }> = {
    draft: { label: "Sin guardar", cls: "border-white/[0.12] bg-white/[0.06] text-bh-fg-3" },
    pending: { label: "En revisión", cls: "border-bh-warning/25 bg-bh-warning/10 text-bh-warning" },
    approved: { label: "Publicado", cls: "border-bh-success/25 bg-bh-success/10 text-bh-success" },
    rejected: { label: "Rechazado", cls: "border-bh-danger/25 bg-bh-danger/10 text-bh-danger" },
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

function StatusDot({ status }: { status: string }) {
  const cls =
    status === "approved"
      ? "bg-bh-success"
      : status === "rejected"
        ? "bg-bh-danger"
        : "bg-bh-warning";
  const label = status === "approved" ? "Publicado" : status === "rejected" ? "Rechazado" : "En revisión";
  return <span title={label} className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${cls}`} />;
}
