"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Autocomplete, AutocompleteItem } from "@heroui/react";
import FormField from "@/components/dashboard/client/FormField";
import type { HonourForEditor, CareerOption } from "@/lib/coach/honours-data";
import {
  upsertHonour,
  deleteHonour,
  type HonourActionResult,
  type HonourInput,
} from "@/app/actions/coach-honours";

const MAX_HONOURS = 30;

type DraftRow = {
  key: string;
  id: string | null;
  title: string;
  competition: string;
  season: string;
  description: string;
  careerItemId: string;
  videoUrl: string;
  status: "pending" | "approved" | "rejected" | "draft";
  rejectionReason: string | null;
};

const toDraft = (r: HonourForEditor): DraftRow => ({
  key: r.id,
  id: r.id,
  title: r.title,
  competition: r.competition ?? "",
  season: r.season ?? "",
  description: r.description ?? "",
  careerItemId: r.careerItemId ?? "",
  videoUrl: r.videoUrl ?? "",
  status: r.status,
  rejectionReason: r.rejectionReason,
});

const blankDraft = (): DraftRow => ({
  key: Math.random().toString(36).slice(2, 10),
  id: null,
  title: "",
  competition: "",
  season: "",
  description: "",
  careerItemId: "",
  videoUrl: "",
  status: "draft",
  rejectionReason: null,
});

export default function CoachHonoursManager({
  honours,
  careerOptions,
  upsertAction = upsertHonour,
  deleteAction = deleteHonour,
  liveMode = false,
}: {
  honours: HonourForEditor[];
  careerOptions: CareerOption[];
  upsertAction?: (input: HonourInput) => Promise<HonourActionResult>;
  deleteAction?: (id: string) => Promise<HonourActionResult>;
  liveMode?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = React.useState<DraftRow[]>(honours.map(toDraft));

  function patch(key: string, p: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }

  const atCap = rows.length >= MAX_HONOURS;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Logros
        </h2>
        <p className="text-sm text-bh-fg-3">
          {liveMode
            ? "Edición directa: lo que guardás se publica al instante."
            : "Cargá tus títulos y logros. Asociá cada uno a una etapa de tu trayectoria y sumá un video opcional. Cada logro se publica recién cuando el equipo lo aprueba; si editás uno aprobado, vuelve a revisión."}
        </p>
        <p className="text-[12px] text-bh-fg-4">Hasta {MAX_HONOURS} logros.</p>
      </div>

      <div className="grid gap-5">
        {rows.map((row) => (
          <HonourCard
            key={row.key}
            row={row}
            careerOptions={careerOptions}
            liveMode={liveMode}
            upsertAction={upsertAction}
            deleteAction={deleteAction}
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
        + Nuevo logro
      </Button>
      {atCap && <p className="-mt-3 text-[12px] text-bh-fg-4">Llegaste al máximo de {MAX_HONOURS} logros.</p>}
    </div>
  );
}

function HonourCard({
  row,
  careerOptions,
  liveMode,
  upsertAction,
  deleteAction,
  onPatch,
  onRemoveLocal,
  onSaved,
}: {
  row: DraftRow;
  careerOptions: CareerOption[];
  liveMode: boolean;
  upsertAction: (input: HonourInput) => Promise<HonourActionResult>;
  deleteAction: (id: string) => Promise<HonourActionResult>;
  onPatch: (p: Partial<DraftRow>) => void;
  onRemoveLocal: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  async function onSave() {
    setSaving(true);
    setMsg(null);
    const res = await upsertAction({
      id: row.id ?? undefined,
      title: row.title.trim(),
      competition: row.competition.trim() || null,
      season: row.season.trim() || null,
      description: row.description.trim() || null,
      careerItemId: row.careerItemId || null,
      videoUrl: row.videoUrl.trim() || null,
    });
    setSaving(false);
    if (res.success) {
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
    if (res.success) {
      onRemoveLocal();
      onSaved();
    } else {
      setMsg({ ok: false, text: res.message ?? "No se pudo eliminar." });
    }
  }

  // Auto-rellena la temporada desde el período de la etapa, si está vacía.
  function onPickStage(id: string) {
    const opt = careerOptions.find((o) => o.id === id);
    const next: Partial<DraftRow> = { careerItemId: id };
    if (opt && !row.season.trim()) next.season = opt.periodLabel;
    onPatch(next);
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
        id={`h-title-${row.key}`}
        isRequired
        label="Título del logro"
        placeholder="Ej: Campeón Liga Profesional"
        value={row.title}
        onChange={(e) => onPatch({ title: e.target.value })}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          id={`h-comp-${row.key}`}
          label="Competición"
          placeholder="Ej: Primera División"
          value={row.competition}
          onChange={(e) => onPatch({ competition: e.target.value })}
        />
        <FormField
          id={`h-season-${row.key}`}
          label="Temporada / Año"
          placeholder="Ej: 2023"
          value={row.season}
          onChange={(e) => onPatch({ season: e.target.value })}
        />
      </div>

      {/* Etapa de la trayectoria (opcional) */}
      <div>
        <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.1em] text-bh-fg-4">
          Etapa de la trayectoria (opcional)
        </label>
        {careerOptions.length > 0 ? (
          <Autocomplete
            aria-label="Etapa de la trayectoria"
            placeholder="Asociar a un club / período"
            selectedKey={row.careerItemId || null}
            onSelectionChange={(key) => onPickStage(key ? String(key) : "")}
            defaultItems={careerOptions}
            classNames={{ base: "max-w-full" }}
            inputProps={{
              classNames: {
                inputWrapper: "bg-bh-surface-2/40 border border-white/[0.10]",
              },
            }}
          >
            {(opt: CareerOption) => (
              <AutocompleteItem key={opt.id} textValue={`${opt.club} ${opt.periodLabel}`}>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-bh-fg-1">{opt.club}</span>
                  <span className="text-[11px] text-bh-fg-4">{opt.periodLabel}</span>
                </div>
              </AutocompleteItem>
            )}
          </Autocomplete>
        ) : (
          <p className="text-[12px] text-bh-fg-4">
            Cargá tu trayectoria primero para poder asociar el logro a una etapa.
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor={`h-desc-${row.key}`}
          className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.1em] text-bh-fg-4"
        >
          Descripción (opcional)
        </label>
        <textarea
          id={`h-desc-${row.key}`}
          rows={2}
          value={row.description}
          onChange={(e) => onPatch({ description: e.target.value })}
          placeholder="Contexto del logro…"
          className="w-full rounded-bh-md border border-white/[0.10] bg-bh-surface-2/40 p-3 text-sm text-bh-fg-1 outline-none placeholder:text-bh-fg-4 focus:border-bh-lime/40"
        />
      </div>

      <FormField
        id={`h-video-${row.key}`}
        label="Video (opcional)"
        placeholder="https:// — YouTube / Vimeo del logro"
        value={row.videoUrl}
        onChange={(e) => onPatch({ videoUrl: e.target.value })}
      />

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
