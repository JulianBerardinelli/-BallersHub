"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import FormField from "@/components/dashboard/client/FormField";
import {
  saveCoachTranslation,
  deleteCoachTranslation,
} from "@/app/actions/coach-translations";

export type CoachTranslatableLocale = "en" | "it" | "pt";

export type CoachLocaleFields = {
  bio: string;
  careerObjectives: string;
  playingStyle: string;
  methodologyAnalysis: string;
  analysisAuthor: string;
};

const LOCALE_LABELS: Record<CoachTranslatableLocale, string> = {
  en: "Inglés",
  it: "Italiano",
  pt: "Portugués",
};

const FIELDS: { key: keyof CoachLocaleFields; label: string; rows: number }[] = [
  { key: "bio", label: "Biografía", rows: 4 },
  { key: "playingStyle", label: "Ideas de juego", rows: 4 },
  { key: "methodologyAnalysis", label: "Análisis metodológico", rows: 4 },
  { key: "careerObjectives", label: "Objetivos", rows: 3 },
  { key: "analysisAuthor", label: "Autor del análisis", rows: 2 },
];

const isEmptyFields = (f: CoachLocaleFields) =>
  !f.bio.trim() &&
  !f.careerObjectives.trim() &&
  !f.playingStyle.trim() &&
  !f.methodologyAnalysis.trim() &&
  !f.analysisAuthor.trim();

export default function CoachTranslationsEditor({
  coachName,
  source,
  translations,
}: {
  coachName: string;
  source: CoachLocaleFields;
  translations: Record<CoachTranslatableLocale, CoachLocaleFields>;
}) {
  const router = useRouter();
  const [active, setActive] = React.useState<CoachTranslatableLocale>("en");
  const [drafts, setDrafts] =
    React.useState<Record<CoachTranslatableLocale, CoachLocaleFields>>(translations);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const current = drafts[active];

  function patch(key: keyof CoachLocaleFields, value: string) {
    setDrafts((prev) => ({ ...prev, [active]: { ...prev[active], [key]: value } }));
  }

  async function onSave() {
    setSaving(true);
    setMsg(null);
    const res = await saveCoachTranslation({ locale: active, ...current });
    setSaving(false);
    if (res.success) {
      setMsg({
        ok: true,
        text: isEmptyFields(current)
          ? `Se despublicó la versión en ${LOCALE_LABELS[active].toLowerCase()}.`
          : `Guardado. Tu página en ${LOCALE_LABELS[active].toLowerCase()} ya está publicada.`,
      });
      router.refresh();
    } else {
      setMsg({ ok: false, text: res.message ?? "No se pudo guardar." });
    }
  }

  async function onUnpublish() {
    setSaving(true);
    setMsg(null);
    const res = await deleteCoachTranslation(active);
    setSaving(false);
    if (res.success) {
      setDrafts((prev) => ({
        ...prev,
        [active]: {
          bio: "",
          careerObjectives: "",
          playingStyle: "",
          methodologyAnalysis: "",
          analysisAuthor: "",
        },
      }));
      setMsg({ ok: true, text: `Se despublicó la versión en ${LOCALE_LABELS[active].toLowerCase()}.` });
      router.refresh();
    } else {
      setMsg({ ok: false, text: res.message ?? "No se pudo despublicar." });
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Idiomas
        </h2>
        <p className="text-sm text-bh-fg-3">
          {coachName} · tu contenido en español ya está publicado. Acá agregás las traducciones.
        </p>
      </div>

      <div className="flex gap-2">
        {(Object.keys(LOCALE_LABELS) as CoachTranslatableLocale[]).map((loc) => {
          const published = !isEmptyFields(drafts[loc]);
          const isActive = loc === active;
          return (
            <button
              key={loc}
              type="button"
              onClick={() => setActive(loc)}
              className={`inline-flex items-center gap-2 rounded-bh-md border px-4 py-2 text-[13px] font-medium transition-colors ${
                isActive
                  ? "border-bh-lime bg-bh-lime/10 text-bh-fg-1"
                  : "border-white/[0.08] bg-transparent text-bh-fg-3 hover:border-white/[0.2]"
              }`}
            >
              {LOCALE_LABELS[loc]}
              <span
                className={`size-1.5 rounded-full ${published ? "bg-bh-success" : "bg-bh-fg-4"}`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            {source[field.key]?.trim() ? (
              <p className="rounded-bh-sm border border-white/[0.06] bg-bh-surface-2 px-3 py-2 text-[11px] leading-[1.5] text-bh-fg-4">
                <span className="font-semibold uppercase tracking-[0.08em] text-bh-fg-3">ES · </span>
                {source[field.key]}
              </p>
            ) : null}
            <FormField
              id={`coach-tr-${active}-${field.key}`}
              as="textarea"
              rows={field.rows}
              label={field.label}
              value={current[field.key]}
              onValueChange={(v) => patch(field.key, v)}
            />
          </div>
        ))}
      </div>

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-bh-success" : "text-bh-danger"}`}>{msg.text}</p>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="flat"
          isDisabled={saving || isEmptyFields(current)}
          onPress={onUnpublish}
          className="rounded-bh-md border border-white/[0.08] bg-transparent px-4 py-2 text-[13px] text-bh-fg-3 hover:border-bh-danger hover:text-bh-danger"
        >
          Despublicar idioma
        </Button>
        <Button
          onPress={onSave}
          isLoading={saving}
          isDisabled={saving}
          className="rounded-bh-md bg-bh-lime px-6 py-2 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]"
        >
          Guardar {LOCALE_LABELS[active]}
        </Button>
      </div>
    </div>
  );
}
