"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@heroui/react";
import FormField from "@/components/dashboard/client/FormField";
import PitchBoardEditor from "@/components/coach/pitch/PitchBoardEditor";
import {
  EMPTY_PITCH_BOARD,
  MAX_GAME_IDEAS,
  type PitchBoard,
} from "@/lib/coach/game-ideas";
import type { GameIdeaForEditor } from "@/lib/coach/game-ideas-data";
import {
  upsertGameIdea,
  deleteGameIdea,
  type GameIdeaActionResult,
  type GameIdeaInput,
} from "@/app/actions/coach-game-ideas";

type DraftRow = {
  key: string;
  id: string | null;
  title: string;
  formation: string;
  blurb: string;
  link: string;
  board: PitchBoard;
  status: "pending" | "approved" | "rejected" | "draft";
  rejectionReason: string | null;
};

const toDraft = (r: GameIdeaForEditor): DraftRow => ({
  key: r.id,
  id: r.id,
  title: r.title ?? "",
  formation: r.formation ?? "",
  blurb: r.blurb ?? "",
  link: r.link ?? "",
  board: r.pitchBoard,
  status: r.status,
  rejectionReason: r.rejectionReason,
});

const blankDraft = (): DraftRow => ({
  key: Math.random().toString(36).slice(2, 10),
  id: null,
  title: "",
  formation: "",
  blurb: "",
  link: "",
  board: { ...EMPTY_PITCH_BOARD, tokens: [], arrows: [] },
  status: "draft",
  rejectionReason: null,
});

export default function CoachGameIdeasManager({
  ideas,
  isPro,
  isHeadCoach,
  upsertAction = upsertGameIdea,
  deleteAction = deleteGameIdea,
  liveMode = false,
}: {
  ideas: GameIdeaForEditor[];
  isPro: boolean;
  /** Sólo el layout DT monta Ideas de Juego. Si false → bloqueo informativo. */
  isHeadCoach: boolean;
  upsertAction?: (input: GameIdeaInput) => Promise<GameIdeaActionResult>;
  deleteAction?: (id: string) => Promise<GameIdeaActionResult>;
  liveMode?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = React.useState<DraftRow[]>(ideas.map(toDraft));

  function patch(key: string, p: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }

  const atCap = rows.length >= MAX_GAME_IDEAS;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Ideas de Juego
        </h2>
        <p className="text-sm text-bh-fg-3">
          {liveMode
            ? "Edición directa: lo que guardás se publica al instante."
            : "Dibujá tus jugadas en la pizarra (fichas + flechas) con una descripción. Cada idea se publica recién cuando el equipo la aprueba; si editás una aprobada, vuelve a revisión."}
        </p>
        <p className="text-[12px] text-bh-fg-4">
          Hasta {MAX_GAME_IDEAS} ideas · función Pro exclusiva del Cuerpo Técnico.
        </p>
      </div>

      {!isHeadCoach && (
        <div className="rounded-bh-md border border-amber-500/25 bg-amber-500/5 p-4 text-[13px] text-bh-fg-2">
          Las Ideas de Juego se muestran sólo en perfiles de <strong>entrenador</strong> (Cuerpo
          Técnico). Tu rol principal usa el layout universal, así que esta sección no aparece en tu
          página pública.
        </div>
      )}

      {!isPro && (
        <div className="rounded-bh-md border border-bh-lime/20 bg-bh-lime/[0.04] p-4 text-[13px] text-bh-fg-2">
          La pizarra de Ideas de Juego es una función Pro.{" "}
          <Link href="/checkout/pro-coach?currency=ARS" className="text-bh-lime hover:underline">
            Activá Pro
          </Link>{" "}
          para crear tus jugadas.
        </div>
      )}

      <div className="grid gap-5">
        {rows.map((row) => (
          <IdeaCard
            key={row.key}
            row={row}
            disabled={!isPro || !isHeadCoach}
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
        isDisabled={atCap || !isPro || !isHeadCoach}
        onPress={() => setRows((prev) => [...prev, blankDraft()])}
        className="w-full rounded-bh-md border border-dashed border-white/[0.12] bg-transparent py-2 text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:border-white/[0.24] hover:text-bh-fg-1 data-[disabled=true]:opacity-40"
      >
        + Nueva idea de juego
      </Button>
      {atCap && (
        <p className="-mt-3 text-[12px] text-bh-fg-4">Llegaste al máximo de {MAX_GAME_IDEAS} ideas.</p>
      )}
    </div>
  );
}

function IdeaCard({
  row,
  disabled,
  liveMode,
  upsertAction,
  deleteAction,
  onPatch,
  onRemoveLocal,
  onSaved,
}: {
  row: DraftRow;
  disabled: boolean;
  liveMode: boolean;
  upsertAction: (input: GameIdeaInput) => Promise<GameIdeaActionResult>;
  deleteAction: (id: string) => Promise<GameIdeaActionResult>;
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
      title: row.title.trim() || null,
      formation: row.formation.trim() || null,
      blurb: row.blurb.trim() || null,
      link: row.link.trim() || null,
      pitchBoard: row.board,
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
    if (res.success) onSaved();
    else setMsg({ ok: false, text: res.message ?? "No se pudo eliminar." });
  }

  return (
    <div className="grid gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
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

      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          id={`gi-title-${row.key}`}
          label="Título"
          placeholder="Ej: Salida limpia ante presión alta"
          value={row.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          disabled={disabled}
        />
        <FormField
          id={`gi-formation-${row.key}`}
          label="Formación base (opcional)"
          placeholder="4-3-3"
          value={row.formation}
          onChange={(e) => onPatch({ formation: e.target.value })}
          disabled={disabled}
        />
      </div>

      {/* Pizarra */}
      <PitchBoardEditor value={row.board} onChange={(board) => onPatch({ board })} disabled={disabled} />

      <div>
        <label
          htmlFor={`gi-blurb-${row.key}`}
          className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.1em] text-bh-fg-4"
        >
          Descripción
        </label>
        <textarea
          id={`gi-blurb-${row.key}`}
          rows={3}
          value={row.blurb}
          onChange={(e) => onPatch({ blurb: e.target.value })}
          disabled={disabled}
          placeholder="Explicá la jugada: movimientos, intención, fases…"
          className="w-full rounded-bh-md border border-white/[0.10] bg-bh-surface-2/40 p-3 text-sm text-bh-fg-1 outline-none placeholder:text-bh-fg-4 focus:border-bh-lime/40 disabled:opacity-50"
        />
      </div>

      <FormField
        id={`gi-link-${row.key}`}
        label="Enlace (opcional)"
        placeholder="https:// — video de la jugada, artículo…"
        value={row.link}
        onChange={(e) => onPatch({ link: e.target.value })}
        disabled={disabled}
      />

      {msg && <p className={`text-[12px] ${msg.ok ? "text-bh-success" : "text-bh-danger"}`}>{msg.text}</p>}

      <div className="flex justify-end">
        <Button
          onPress={onSave}
          isLoading={saving}
          isDisabled={saving || disabled}
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
