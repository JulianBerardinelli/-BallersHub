"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { Check, Globe, Lock, Save, Trash2 } from "lucide-react";

import SectionCard from "@/components/dashboard/client/SectionCard";
import FormField from "@/components/dashboard/client/FormField";
import {
  savePlayerTranslation,
  deletePlayerTranslation,
  type TranslationFields,
} from "../actions";

export type LocaleFields = {
  bio: string;
  careerObjectives: string;
  topCharacteristics: string[];
  tacticsAnalysis: string;
  physicalAnalysis: string;
  mentalAnalysis: string;
  techniqueAnalysis: string;
  analysisAuthor: string;
};

type EditableLocale = "en" | "it" | "pt";
type AnyLocale = "es" | EditableLocale;

const LOCALES: { code: AnyLocale; label: string; flag: string; native?: boolean }[] = [
  { code: "es", label: "Español", flag: "🇦🇷", native: true },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
];

const FIELD_KEYS: (keyof LocaleFields)[] = [
  "bio",
  "careerObjectives",
  "topCharacteristics",
  "tacticsAnalysis",
  "physicalAnalysis",
  "mentalAnalysis",
  "techniqueAnalysis",
  "analysisAuthor",
];

function emptyFields(): LocaleFields {
  return {
    bio: "",
    careerObjectives: "",
    topCharacteristics: [],
    tacticsAnalysis: "",
    physicalAnalysis: "",
    mentalAnalysis: "",
    techniqueAnalysis: "",
    analysisAuthor: "",
  };
}

function completeness(f: LocaleFields | undefined): number {
  if (!f) return 0;
  const filled = FIELD_KEYS.filter((k) => {
    const v = f[k];
    return Array.isArray(v) ? v.length > 0 : v.trim().length > 0;
  }).length;
  return Math.round((filled / FIELD_KEYS.length) * 100);
}

export default function TranslationsEditor({
  playerId,
  baseEs,
  translations,
  initialAvailable,
}: {
  playerId: string;
  baseEs: LocaleFields;
  translations: Partial<Record<EditableLocale, LocaleFields>>;
  initialAvailable: string[];
}) {
  const [active, setActive] = useState<AnyLocale>("en");
  const [available, setAvailable] = useState<string[]>(initialAvailable);
  const [drafts, setDrafts] = useState<Record<EditableLocale, LocaleFields>>({
    en: translations.en ?? emptyFields(),
    it: translations.it ?? emptyFields(),
    pt: translations.pt ?? emptyFields(),
  });
  const [feedback, setFeedback] = useState<
    { type: "success" | "danger"; message: string } | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const fieldsByLocale = useMemo<Record<AnyLocale, LocaleFields>>(
    () => ({ es: baseEs, ...drafts }),
    [baseEs, drafts],
  );

  function patch(field: keyof LocaleFields, value: string | string[]) {
    if (active === "es") return;
    setDrafts((prev) => ({
      ...prev,
      [active]: { ...prev[active as EditableLocale], [field]: value },
    }));
    setFeedback(null);
  }

  function onSave() {
    if (active === "es") return;
    const locale = active as EditableLocale;
    startTransition(async () => {
      const res = await savePlayerTranslation({
        playerId,
        locale,
        fields: drafts[locale] as TranslationFields,
      });
      setFeedback({ type: res.success ? "success" : "danger", message: res.message });
      if (res.success) setAvailable(res.availableLocales);
    });
  }

  function onDelete() {
    if (active === "es") return;
    const locale = active as EditableLocale;
    startTransition(async () => {
      const res = await deletePlayerTranslation({ playerId, locale });
      setFeedback({ type: res.success ? "success" : "danger", message: res.message });
      if (res.success) {
        setAvailable(res.availableLocales);
        setDrafts((prev) => ({ ...prev, [locale]: emptyFields() }));
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ---------- Overview / language switch + completeness ---------- */}
      <SectionCard
        title="Versiones del perfil"
        description="Elegí un idioma para editarlo. El español es tu versión nativa; los demás se publican solo cuando los guardás."
      >
        <div className="grid gap-2">
          {LOCALES.map((l) => {
            const pct = completeness(fieldsByLocale[l.code]);
            const isActive = l.code === active;
            const published = available.includes(l.code);
            const accent =
              pct === 100 ? "bg-bh-lime" : pct > 0 ? "bg-bh-blue" : "bg-white/15";
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setActive(l.code);
                  setFeedback(null);
                }}
                aria-pressed={isActive}
                className={`group flex items-center gap-3 rounded-bh-md border px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? "border-bh-lime/40 bg-bh-lime/[0.06]"
                    : "border-white/[0.08] bg-bh-surface-1 hover:border-white/[0.18]"
                }`}
              >
                <span className="text-base leading-none" aria-hidden>
                  {l.flag}
                </span>
                <span className="flex min-w-[120px] flex-col">
                  <span className="text-[13px] font-semibold text-bh-fg-1">
                    {l.label}
                    {l.native ? (
                      <span className="ml-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-bh-fg-4">
                        nativo
                      </span>
                    ) : null}
                  </span>
                  <span className="font-bh-mono text-[10px] uppercase tracking-[0.14em] text-bh-fg-4">
                    {l.code}
                  </span>
                </span>

                {/* completeness bar */}
                <span className="relative h-1.5 flex-1 overflow-hidden rounded-bh-pill bg-white/[0.06]">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-bh-pill ${accent} transition-[width] duration-300`}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-9 text-right font-bh-mono text-[11px] text-bh-fg-2">
                  {pct}%
                </span>

                {/* status chip */}
                {l.native ? (
                  <Chip size="sm" variant="flat" className="bg-white/[0.06] text-bh-fg-3">
                    base
                  </Chip>
                ) : published ? (
                  <Chip
                    size="sm"
                    variant="flat"
                    startContent={<Check className="size-3" />}
                    className="bg-bh-lime/[0.12] text-bh-lime"
                  >
                    publicado
                  </Chip>
                ) : (
                  <Chip size="sm" variant="flat" className="bg-white/[0.06] text-bh-fg-4">
                    sin publicar
                  </Chip>
                )}
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ---------- Active locale editor ---------- */}
      {active === "es" ? (
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <Lock className="size-4 text-bh-fg-3" />
              Versión nativa (Español)
            </span>
          }
          description="El contenido en español es tu base. Editalo desde Datos personales y Football data — acá lo ves de referencia mientras traducís."
        >
          <ReadOnlyPreview fields={baseEs} />
        </SectionCard>
      ) : (
        <LocaleForm
          key={active}
          locale={active}
          fields={drafts[active as EditableLocale]}
          base={baseEs}
          onPatch={patch}
          onSave={onSave}
          onDelete={onDelete}
          isPending={isPending}
          published={available.includes(active)}
          feedback={feedback}
        />
      )}
    </div>
  );
}

// --------------------------- Locale form ---------------------------

const LABELS: Record<keyof LocaleFields, { label: string; multiline?: boolean }> = {
  bio: { label: "Biografía", multiline: true },
  careerObjectives: { label: "Objetivos de carrera", multiline: true },
  topCharacteristics: { label: "Características destacadas (una por línea)", multiline: true },
  tacticsAnalysis: { label: "Análisis táctico", multiline: true },
  physicalAnalysis: { label: "Análisis físico", multiline: true },
  mentalAnalysis: { label: "Análisis mental", multiline: true },
  techniqueAnalysis: { label: "Análisis técnico", multiline: true },
  analysisAuthor: { label: "Autor del análisis" },
};

function LocaleForm({
  locale,
  fields,
  base,
  onPatch,
  onSave,
  onDelete,
  isPending,
  published,
  feedback,
}: {
  locale: EditableLocale;
  fields: LocaleFields;
  base: LocaleFields;
  onPatch: (field: keyof LocaleFields, value: string | string[]) => void;
  onSave: () => void;
  onDelete: () => void;
  isPending: boolean;
  published: boolean;
  feedback: { type: "success" | "danger"; message: string } | null;
}) {
  const localeLabel = LOCALES.find((l) => l.code === locale)?.label ?? locale;

  const renderField = (key: keyof LocaleFields) => {
    const meta = LABELS[key];
    const esHint = Array.isArray(base[key])
      ? (base[key] as string[]).join(" · ")
      : (base[key] as string);
    if (key === "topCharacteristics") {
      return (
        <FormField
          key={key}
          as="textarea"
          id={`${locale}-${key}`}
          label={meta.label}
          rows={4}
          value={(fields.topCharacteristics ?? []).join("\n")}
          description={esHint ? `ES: ${esHint}` : undefined}
          onValueChange={(v) =>
            onPatch(
              "topCharacteristics",
              v.split("\n").map((s) => s.trim()).filter(Boolean),
            )
          }
        />
      );
    }
    return (
      <FormField
        key={key}
        as={meta.multiline ? "textarea" : undefined}
        id={`${locale}-${key}`}
        label={meta.label}
        rows={meta.multiline ? 4 : undefined}
        value={fields[key] as string}
        description={esHint ? `ES: ${esHint}` : undefined}
        onValueChange={(v) => onPatch(key, v)}
      />
    );
  };

  return (
    <>
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Globe className="size-4 text-bh-blue" />
            Biografía y objetivos · {localeLabel}
          </span>
        }
        description="Escribí cada campo en el idioma de destino. Debajo de cada uno ves el texto en español como referencia."
      >
        <div className="grid gap-5">
          {renderField("bio")}
          {renderField("careerObjectives")}
          {renderField("topCharacteristics")}
        </div>
      </SectionCard>

      <SectionCard
        title={`Análisis de scouting · ${localeLabel}`}
        description="Las cuatro dimensiones del análisis + el autor."
      >
        <div className="grid gap-5">
          {renderField("tacticsAnalysis")}
          {renderField("physicalAnalysis")}
          {renderField("mentalAnalysis")}
          {renderField("techniqueAnalysis")}
          {renderField("analysisAuthor")}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-[28px]">
            {feedback ? (
              <Chip
                color={feedback.type === "success" ? "success" : "danger"}
                variant="flat"
                className="text-[13px]"
              >
                {feedback.message}
              </Chip>
            ) : null}
          </div>
          <div className="flex gap-2">
            {published ? (
              <Button
                variant="light"
                size="sm"
                startContent={<Trash2 className="size-4" />}
                onPress={onDelete}
                isDisabled={isPending}
                className="text-bh-fg-3"
              >
                Quitar idioma
              </Button>
            ) : null}
            <Button
              color="primary"
              startContent={<Save className="size-4" />}
              onPress={onSave}
              isLoading={isPending}
              isDisabled={isPending}
            >
              Guardar versión {locale.toUpperCase()}
            </Button>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

// --------------------------- ES read-only preview ---------------------------

function ReadOnlyPreview({ fields }: { fields: LocaleFields }) {
  const rows: { label: string; value: string }[] = [
    { label: "Biografía", value: fields.bio },
    { label: "Objetivos de carrera", value: fields.careerObjectives },
    { label: "Características", value: (fields.topCharacteristics ?? []).join(" · ") },
    { label: "Análisis táctico", value: fields.tacticsAnalysis },
    { label: "Análisis físico", value: fields.physicalAnalysis },
    { label: "Análisis mental", value: fields.mentalAnalysis },
    { label: "Análisis técnico", value: fields.techniqueAnalysis },
    { label: "Autor del análisis", value: fields.analysisAuthor },
  ];
  return (
    <div className="grid gap-4">
      {rows.map((r) => (
        <div key={r.label} className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-3">
            {r.label}
          </p>
          <p className="whitespace-pre-line text-[13px] leading-[1.55] text-bh-fg-2">
            {r.value?.trim() ? r.value : <span className="text-bh-fg-4">— sin completar —</span>}
          </p>
        </div>
      ))}
    </div>
  );
}
