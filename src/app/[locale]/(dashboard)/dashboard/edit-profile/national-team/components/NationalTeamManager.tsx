"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Pencil, Plus, Trash2, X } from "lucide-react";

import CountryFlag from "@/components/common/CountryFlag";
import CountrySinglePicker, { type CountryPick } from "@/components/common/CountrySinglePicker";
import UpgradeModal, { useUpgradeModal } from "@/components/dashboard/plan/UpgradeModal";
import { bhButtonClass } from "@/components/ui/BhButton";
import {
  NT_AGE_CATEGORY_LABELS,
  NT_AGE_CATEGORY_ORDER,
  NT_PARTICIPATION_LABELS,
  NT_PARTICIPATION_ORDER,
  NT_HIGHLIGHT_SUGGESTIONS,
} from "@/lib/dashboard/national-team";
import type {
  NationalTeamAgeCategory,
  NationalTeamParticipation,
} from "@/db/schema/nationalTeams";
import type { UpsertNationalTeamStintInput } from "../schemas";
import { upsertNationalTeamStint, deleteNationalTeamStint } from "../actions";

type StintActionResult = { success: true; id?: string } | { success: false; message: string };
/** Upsert/delete are injectable so the admin CRUD can reuse this editor with
 * its own service-role, review-bypassing actions (mirrors CareerManager). */
export type UpsertStintAction = (input: UpsertNationalTeamStintInput) => Promise<StintActionResult>;
export type DeleteStintAction = (input: { playerId: string; id: string }) => Promise<StintActionResult>;

export type NationalTeamStintView = {
  id: string;
  teamId: string | null;
  proposedTeamName: string | null;
  countryCode: string | null;
  ageCategory: NationalTeamAgeCategory;
  participation: NationalTeamParticipation;
  highlights: string[] | null;
  startYear: number | null;
  endYear: number | null;
  description: string | null;
  caps: number | null;
  goals: number | null;
  assists: number | null;
  minutes: number | null;
  referenceUrl: string | null;
  status: "draft" | "pending_review" | "approved" | "rejected";
  resolutionNote: string | null;
};

type DraftState = {
  id?: string;
  country: CountryPick | null;
  ageCategory: NationalTeamAgeCategory | "";
  participation: NationalTeamParticipation;
  startYear: string;
  endYear: string;
  description: string;
  highlights: string[];
  caps: string;
  goals: string;
  assists: string;
  minutes: string;
  referenceUrl: string;
};

const EMPTY_DRAFT: DraftState = {
  country: null,
  ageCategory: "",
  participation: "called_up",
  startYear: "",
  endYear: "",
  description: "",
  highlights: [],
  caps: "",
  goals: "",
  assists: "",
  minutes: "",
  referenceUrl: "",
};

const fieldClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-bh-lime/50 focus:outline-none";
// Selects nativos: `color-scheme: dark` fuerza el menú desplegable en oscuro.
// Sin esto, en SOs/navegadores en modo claro las opciones salían
// blanco-sobre-blanco (ilegibles). Reportado por un admin tester.
const selectClass = `${fieldClass} [color-scheme:dark]`;
const labelClass = "mb-1 block text-xs font-medium text-white/70";

type StatusMsg = { type: "error" | "success"; message: string } | null;

const STATUS_META: Record<
  NationalTeamStintView["status"],
  { label: string; cls: string; Icon: typeof Clock }
> = {
  draft: { label: "Borrador", cls: "bg-white/10 text-white/70", Icon: Clock },
  pending_review: { label: "En revisión", cls: "bg-amber-500/15 text-amber-300", Icon: Clock },
  approved: { label: "Aprobada", cls: "bg-bh-lime/15 text-bh-lime", Icon: CheckCircle2 },
  rejected: { label: "Rechazada", cls: "bg-red-500/15 text-red-300", Icon: AlertTriangle },
};

export default function NationalTeamManager({
  playerId,
  isPro,
  stints,
  adminMode = false,
  upsertAction = upsertNationalTeamStint,
  deleteAction = deleteNationalTeamStint,
}: {
  playerId: string;
  isPro: boolean;
  stints: NationalTeamStintView[];
  /** Admin CRUD: bypass the Pro soft-save gate; saves write live (approved). */
  adminMode?: boolean;
  upsertAction?: UpsertStintAction;
  deleteAction?: DeleteStintAction;
}) {
  const router = useRouter();
  const upgradeModal = useUpgradeModal();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [status, setStatus] = useState<StatusMsg>(null);
  const [customHighlight, setCustomHighlight] = useState("");

  const openAdd = () => {
    setStatus(null);
    setShowStats(false);
    setDraft({ ...EMPTY_DRAFT });
  };

  const openEdit = (s: NationalTeamStintView) => {
    setStatus(null);
    setShowStats(Boolean(s.caps || s.goals || s.assists || s.minutes));
    setDraft({
      id: s.id,
      country: s.countryCode
        ? { code: s.countryCode, name: s.proposedTeamName ?? s.countryCode }
        : null,
      ageCategory: s.ageCategory,
      participation: s.participation,
      startYear: s.startYear?.toString() ?? "",
      endYear: s.endYear?.toString() ?? "",
      description: s.description ?? "",
      highlights: s.highlights ?? [],
      caps: s.caps?.toString() ?? "",
      goals: s.goals?.toString() ?? "",
      assists: s.assists?.toString() ?? "",
      minutes: s.minutes?.toString() ?? "",
      referenceUrl: s.referenceUrl ?? "",
    });
  };

  const toggleHighlight = (h: string) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            highlights: d.highlights.includes(h)
              ? d.highlights.filter((x) => x !== h)
              : [...d.highlights, h],
          }
        : d,
    );
  };

  const addCustomHighlight = () => {
    const v = customHighlight.trim();
    if (!v) return;
    setDraft((d) => (d && !d.highlights.includes(v) ? { ...d, highlights: [...d.highlights, v] } : d));
    setCustomHighlight("");
  };

  const handleSave = () => {
    if (!draft) return;
    if (!draft.country) {
      setStatus({ type: "error", message: "Elegí el país de la selección." });
      return;
    }
    if (!draft.ageCategory) {
      setStatus({ type: "error", message: "Elegí la categoría." });
      return;
    }

    // Soft-save gate: Free puede completar pero no guardar. El admin (adminMode)
    // siempre puede guardar, sin importar el plan del jugador.
    if (!adminMode && !isPro) {
      upgradeModal.open("nationalTeam");
      return;
    }

    const stint = {
      id: draft.id,
      teamId: null,
      proposedTeamName: draft.country.name,
      countryCode: draft.country.code,
      ageCategory: draft.ageCategory as NationalTeamAgeCategory,
      participation: draft.participation,
      highlights: draft.highlights,
      startYear: draft.startYear || null,
      endYear: draft.endYear || null,
      description: draft.description || null,
      caps: draft.caps || null,
      goals: draft.goals || null,
      assists: draft.assists || null,
      minutes: draft.minutes || null,
      referenceUrl: draft.referenceUrl || null,
    };

    startTransition(async () => {
      const res = await upsertAction({ playerId, stint });
      if (!res.success) {
        setStatus({ type: "error", message: res.message });
        return;
      }
      setStatus({
        type: "success",
        message: adminMode ? "Etapa guardada." : "Etapa enviada a revisión.",
      });
      setDraft(null);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar esta etapa de selección? No se puede deshacer.")) return;
    startTransition(async () => {
      const res = await deleteAction({ playerId, id });
      if (!res.success) {
        setStatus({ type: "error", message: res.message });
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {status ? (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            status.type === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-bh-lime/30 bg-bh-lime/10 text-bh-lime"
          }`}
        >
          {status.message}
        </div>
      ) : null}

      {/* Lista de etapas */}
      <div className="space-y-3">
        {stints.length === 0 && !draft ? (
          <p className="text-sm text-white/50">
            Todavía no cargaste ninguna experiencia en selección nacional.
          </p>
        ) : null}

        {stints.map((s) => {
          const meta = STATUS_META[s.status];
          const period =
            s.startYear || s.endYear
              ? `${s.startYear ?? "?"}–${s.endYear ?? "Actual"}`
              : null;
          return (
            <div
              key={s.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    {s.countryCode ? <CountryFlag code={s.countryCode} size={18} /> : null}
                    <span className="font-semibold text-white">
                      Selección {s.proposedTeamName ?? "Selección"}
                    </span>
                    <span className="rounded-full bg-bh-lime/10 px-2 py-0.5 text-[11px] font-medium text-bh-lime">
                      {NT_AGE_CATEGORY_LABELS[s.ageCategory]}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                    <span className="rounded-full bg-white/10 px-2 py-0.5">
                      {NT_PARTICIPATION_LABELS[s.participation]}
                    </span>
                    {period ? <span>{period}</span> : null}
                  </div>
                  {s.highlights && s.highlights.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {s.highlights.map((h) => (
                        <span
                          key={h}
                          className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/70"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}
                  >
                    <meta.Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                </div>
              </div>

              {s.status === "rejected" && s.resolutionNote ? (
                <p className="mt-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-200">
                  <span className="font-semibold">Observación del equipo: </span>
                  {s.resolutionNote}
                </p>
              ) : null}

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  className={bhButtonClass({ variant: "ghost", size: "sm" })}
                  onClick={() => openEdit(s)}
                  disabled={pending}
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                <button
                  type="button"
                  className={bhButtonClass({ variant: "danger-soft", size: "sm" })}
                  onClick={() => handleDelete(s.id)}
                  disabled={pending}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor */}
      {draft ? (
        <div className="space-y-4 rounded-xl border border-bh-lime/20 bg-white/[0.02] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <CountrySinglePicker
                label="País de la selección *"
                placeholder="Escribí para buscar…"
                value={draft.country}
                onChange={(c) => setDraft({ ...draft, country: c })}
              />
            </div>
            <div>
              <label className={labelClass}>Categoría *</label>
              <select
                className={selectClass}
                value={draft.ageCategory}
                onChange={(e) =>
                  setDraft({ ...draft, ageCategory: e.target.value as NationalTeamAgeCategory })
                }
              >
                <option value="">Elegí…</option>
                {NT_AGE_CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {NT_AGE_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Tipo de participación</label>
              <select
                className={selectClass}
                value={draft.participation}
                onChange={(e) =>
                  setDraft({ ...draft, participation: e.target.value as NationalTeamParticipation })
                }
              >
                {NT_PARTICIPATION_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {NT_PARTICIPATION_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Año inicio</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className={fieldClass}
                  placeholder="2019"
                  value={draft.startYear}
                  onChange={(e) => setDraft({ ...draft, startYear: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Año fin</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className={fieldClass}
                  placeholder="Actual"
                  value={draft.endYear}
                  onChange={(e) => setDraft({ ...draft, endYear: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Descripción breve</label>
            <textarea
              className={`${fieldClass} min-h-[72px] resize-y`}
              maxLength={600}
              placeholder="Contanos sobre tu convocatoria, torneos disputados, etc."
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>

          {/* Info extra (highlights) */}
          <div>
            <label className={labelClass}>Info extra</label>
            <div className="flex flex-wrap gap-1.5">
              {NT_HIGHLIGHT_SUGGESTIONS.map((h) => {
                const active = draft.highlights.includes(h);
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => toggleHighlight(h)}
                    className={`rounded-full px-2.5 py-1 text-xs transition ${
                      active
                        ? "bg-bh-lime/20 text-bh-lime ring-1 ring-bh-lime/40"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
              {draft.highlights
                .filter((h) => !NT_HIGHLIGHT_SUGGESTIONS.includes(h as (typeof NT_HIGHLIGHT_SUGGESTIONS)[number]))
                .map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => toggleHighlight(h)}
                    className="inline-flex items-center gap-1 rounded-full bg-bh-lime/20 px-2.5 py-1 text-xs text-bh-lime ring-1 ring-bh-lime/40"
                  >
                    {h}
                    <X className="h-3 w-3" />
                  </button>
                ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className={fieldClass}
                placeholder="Agregar otra (ej. Mundial Sub-20)"
                value={customHighlight}
                onChange={(e) => setCustomHighlight(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomHighlight();
                  }
                }}
              />
              <button
                type="button"
                className={bhButtonClass({ variant: "outline", size: "sm" })}
                onClick={addCustomHighlight}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Stats opcionales */}
          <div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white"
              onClick={() => setShowStats((v) => !v)}
            >
              <ChevronDown className={`h-3.5 w-3.5 transition ${showStats ? "rotate-180" : ""}`} />
              Estadísticas (opcional)
            </button>
            {showStats ? (
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ["caps", "PJ"],
                    ["goals", "Goles"],
                    ["assists", "Asist."],
                    ["minutes", "Min."],
                  ] as const
                ).map(([key, lbl]) => (
                  <div key={key}>
                    <label className={labelClass}>{lbl}</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className={fieldClass}
                      value={draft[key]}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <label className={labelClass}>Link de respaldo (para verificación)</label>
            <input
              className={fieldClass}
              placeholder="https://… (Transfermarkt, federación, nota de prensa)"
              value={draft.referenceUrl}
              onChange={(e) => setDraft({ ...draft, referenceUrl: e.target.value })}
            />
            <p className="mt-1 text-[11px] text-white/40">
              Nos ayuda a verificar tu participación más rápido.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={bhButtonClass({ variant: "lime", size: "sm" })}
              onClick={handleSave}
              disabled={pending}
            >
              {pending
                ? "Guardando…"
                : draft.id
                  ? "Guardar cambios"
                  : adminMode
                    ? "Agregar etapa"
                    : "Enviar a revisión"}
            </button>
            <button
              type="button"
              className={bhButtonClass({ variant: "ghost", size: "sm" })}
              onClick={() => {
                setDraft(null);
                setStatus(null);
              }}
              disabled={pending}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={bhButtonClass({ variant: "outline", size: "sm" })}
          onClick={openAdd}
          disabled={pending}
        >
          <Plus className="h-4 w-4" /> Agregar experiencia
        </button>
      )}

      <UpgradeModal state={upgradeModal.state} onClose={upgradeModal.close} />
    </div>
  );
}
