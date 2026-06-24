"use client";

import * as React from "react";
import { Button } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";

import {
  NT_AGE_CATEGORY_LABELS,
  NT_AGE_CATEGORY_ORDER,
  NT_PARTICIPATION_LABELS,
  NT_PARTICIPATION_ORDER,
} from "@/lib/dashboard/national-team";
import type {
  NationalTeamAgeCategory,
  NationalTeamParticipation,
} from "@/db/schema/nationalTeams";
import CountrySinglePicker, { type CountryPick } from "@/components/common/CountrySinglePicker";

// Lo que viaja al submit (se guarda en player_applications.notes.national_team
// y se materializa a national_team_stints como `pending_review` al aprobar).
export type NationalTeamApplyItem = {
  countryCode: string;
  countryName: string;
  ageCategory: NationalTeamAgeCategory;
  participation: NationalTeamParticipation;
  startYear: number | null;
  endYear: number | null;
  description: string | null;
};

const fieldClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-bh-lime/50 focus:outline-none";
// `color-scheme: dark` evita que las opciones del select nativo salgan
// blanco-sobre-blanco en SOs/navegadores en modo claro.
const selectClass = `${fieldClass} [color-scheme:dark]`;
const labelClass = "mb-1 block text-xs font-medium text-white/70";

type Draft = {
  country: CountryPick | null;
  ageCategory: NationalTeamAgeCategory | "";
  participation: NationalTeamParticipation;
  startYear: string;
  endYear: string;
  description: string;
};

const EMPTY_DRAFT: Draft = {
  country: null,
  ageCategory: "",
  participation: "called_up",
  startYear: "",
  endYear: "",
  description: "",
};

export default function Step2bNationalTeam({
  defaultValue,
  onBack,
  onNext,
}: {
  defaultValue?: NationalTeamApplyItem[];
  onBack: () => void;
  onNext: (data: NationalTeamApplyItem[]) => void;
}) {
  const [played, setPlayed] = React.useState<"yes" | "no" | null>(
    defaultValue && defaultValue.length > 0 ? "yes" : null,
  );
  const [items, setItems] = React.useState<NationalTeamApplyItem[]>(defaultValue ?? []);
  const [draft, setDraft] = React.useState<Draft>({ ...EMPTY_DRAFT });
  const [error, setError] = React.useState<string | null>(null);

  const addItem = () => {
    setError(null);
    if (!draft.country) {
      setError("Elegí el país de la selección.");
      return;
    }
    if (!draft.ageCategory) {
      setError("Elegí la categoría.");
      return;
    }
    const item: NationalTeamApplyItem = {
      countryCode: draft.country.code,
      countryName: draft.country.name,
      ageCategory: draft.ageCategory as NationalTeamAgeCategory,
      participation: draft.participation,
      startYear: draft.startYear ? Number(draft.startYear) : null,
      endYear: draft.endYear ? Number(draft.endYear) : null,
      description: draft.description.trim() || null,
    };
    setItems((prev) => [...prev, item]);
    setDraft({ ...EMPTY_DRAFT });
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleContinue = () => {
    setError(null);
    if (played === null) {
      setError("Contanos si tuviste experiencia en una selección nacional.");
      return;
    }
    if (played === "no") {
      onNext([]);
      return;
    }
    if (items.length === 0) {
      setError("Agregá al menos una experiencia o elegí “No / Ahora no”.");
      return;
    }
    onNext(items);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
        <div>
          <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
            Selección Nacional
          </h3>
          <p className="mt-1 text-sm text-bh-fg-3">
            ¿Tenés experiencia a nivel Selección Nacional? Si fuiste convocado/a, jugaste o
            participaste (incluido sparring o concentración) en una selección —juvenil o mayor—,
            contanos. Es un antecedente de mucho peso, así que{" "}
            <span className="text-bh-fg-2">nuestro equipo lo verifica antes de publicarlo</span>.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPlayed("yes")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              played === "yes"
                ? "bg-bh-lime text-bh-black"
                : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            Sí, tengo experiencia
          </button>
          <button
            type="button"
            onClick={() => {
              setPlayed("no");
              setError(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              played === "no"
                ? "bg-white/20 text-white"
                : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            No / Ahora no
          </button>
        </div>

        {played === "yes" ? (
          <div className="space-y-4">
            {/* Lista de experiencias agregadas */}
            {items.length > 0 ? (
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <span className="text-sm text-white">
                      Selección {it.countryName} · {NT_AGE_CATEGORY_LABELS[it.ageCategory]} ·{" "}
                      {NT_PARTICIPATION_LABELS[it.participation]}
                      {it.startYear || it.endYear
                        ? ` · ${it.startYear ?? "?"}–${it.endYear ?? "Actual"}`
                        : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-white/40 hover:text-red-300"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Sub-form para agregar */}
            <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 sm:grid-cols-2">
              <div>
                <CountrySinglePicker
                  label="País *"
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
                <label className={labelClass}>Participación</label>
                <select
                  className={selectClass}
                  value={draft.participation}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      participation: e.target.value as NationalTeamParticipation,
                    })
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
              <div className="sm:col-span-2">
                <label className={labelClass}>Descripción breve (opcional)</label>
                <textarea
                  className={`${fieldClass} min-h-[60px] resize-y`}
                  maxLength={600}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-bh-lime/40 bg-bh-lime/10 px-3 py-1.5 text-sm font-medium text-bh-lime hover:bg-bh-lime/20"
                >
                  <Plus className="h-4 w-4" /> Agregar experiencia
                </button>
              </div>
            </div>

            <p className="text-[11px] text-bh-fg-4">
              Vas a poder sumar fotos y estadísticas más tarde desde tu panel (función Pro), una vez
              aprobada.
            </p>
          </div>
        ) : null}

        {error ? <p className="text-sm text-bh-danger">{error}</p> : null}
      </div>

      <div className="flex justify-between">
        <Button
          variant="flat"
          onPress={onBack}
          className="rounded-bh-md border border-bh-fg-4 bg-transparent px-5 py-2 text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:border-bh-fg-3 hover:bg-white/[0.06] hover:text-bh-fg-1"
        >
          Volver
        </Button>
        <Button
          onPress={handleContinue}
          className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26]"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
