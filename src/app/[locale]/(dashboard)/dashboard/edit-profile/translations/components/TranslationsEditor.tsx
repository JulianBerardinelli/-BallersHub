"use client";

import { useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { Check, Globe, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";

import SectionCard from "@/components/dashboard/client/SectionCard";
import FormField from "@/components/dashboard/client/FormField";
import {
  savePlayerTranslation,
  deletePlayerTranslation,
  generateTranslationDraft,
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
type Block = "bio" | "scouting";
// Which model powers the assistant — drives the brand glyph on the button.
type AiProvider = "gemini" | "claude" | null;

const BASE_ORDER: AnyLocale[] = ["es", "en", "it", "pt"];

const LOCALE_META: Record<AnyLocale, { label: string; flag: string }> = {
  es: { label: "Español", flag: "🇦🇷" },
  en: { label: "English", flag: "🇬🇧" },
  it: { label: "Italiano", flag: "🇮🇹" },
  pt: { label: "Português", flag: "🇧🇷" },
};

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

const BLOCK_FIELDS: Record<Block, (keyof LocaleFields)[]> = {
  bio: ["bio", "careerObjectives", "topCharacteristics"],
  scouting: [
    "tacticsAnalysis",
    "physicalAnalysis",
    "mentalAnalysis",
    "techniqueAnalysis",
    "analysisAuthor",
  ],
};

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

function normalizeLocale(value: string): AnyLocale {
  return (BASE_ORDER as string[]).includes(value) ? (value as AnyLocale) : "es";
}

export default function TranslationsEditor({
  playerId,
  baseEs,
  translations,
  initialAvailable,
  preferredLocale,
  aiProvider,
}: {
  playerId: string;
  baseEs: LocaleFields;
  translations: Partial<Record<EditableLocale, LocaleFields>>;
  initialAvailable: string[];
  preferredLocale: string;
  aiProvider: AiProvider;
}) {
  // The player's native language leads the list and is the source the AI
  // assistant translates FROM (model B1). es stays the canonical /slug.
  const native = normalizeLocale(preferredLocale);
  const orderedLocales: AnyLocale[] = [
    native,
    ...BASE_ORDER.filter((l) => l !== native),
  ];

  const [active, setActive] = useState<AnyLocale>(native);
  const [available, setAvailable] = useState<string[]>(initialAvailable);
  const [drafts, setDrafts] = useState<Record<AnyLocale, LocaleFields>>({
    es: baseEs,
    en: translations.en ?? emptyFields(),
    it: translations.it ?? emptyFields(),
    pt: translations.pt ?? emptyFields(),
  });
  const [feedback, setFeedback] = useState<
    { type: "success" | "danger"; message: string } | null
  >(null);
  const [isSaving, startSave] = useTransition();
  const [genBlock, setGenBlock] = useState<Block | null>(null);
  const [isGenerating, startGen] = useTransition();

  function patch(field: keyof LocaleFields, value: string | string[]) {
    setDrafts((prev) => ({
      ...prev,
      [active]: { ...prev[active], [field]: value },
    }));
    setFeedback(null);
  }

  function onSave() {
    const locale = active;
    startSave(async () => {
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
    if (active === "es") return; // es is the canonical base, never deletable
    const locale = active;
    startSave(async () => {
      const res = await deletePlayerTranslation({ playerId, locale });
      setFeedback({ type: res.success ? "success" : "danger", message: res.message });
      if (res.success) {
        setAvailable(res.availableLocales);
        setDrafts((prev) => ({ ...prev, [locale]: emptyFields() }));
      }
    });
  }

  function onGenerate(block: Block, force: boolean) {
    if (active === native) return; // can't translate the source into itself
    const locale = active;
    setGenBlock(block);
    startGen(async () => {
      const res = await generateTranslationDraft({ playerId, locale, block, force });
      setGenBlock(null);
      if (!res.success) {
        setFeedback({ type: "danger", message: res.message });
        return;
      }
      if (res.draft) {
        setDrafts((prev) => ({
          ...prev,
          [locale]: { ...prev[locale], ...(res.draft as Partial<LocaleFields>) },
        }));
      }
      setFeedback({ type: "success", message: res.message });
    });
  }

  return (
    <div className="space-y-6">
      {/* ---------- Overview / language switch + completeness ---------- */}
      <SectionCard
        title="Versiones del perfil"
        description="Elegí un idioma para editarlo. Marcamos tu idioma nativo; el español es tu versión canónica — la que ve Google en tu perfil público."
      >
        <div className="grid gap-2">
          {orderedLocales.map((code) => {
            const meta = LOCALE_META[code];
            const pct = completeness(drafts[code]);
            const isActive = code === active;
            const isNativeRow = code === native;
            const isEs = code === "es";
            const published = available.includes(code);
            const accent =
              pct === 100 ? "bg-bh-lime" : pct > 0 ? "bg-bh-blue" : "bg-white/15";
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setActive(code);
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
                  {meta.flag}
                </span>
                <span className="flex min-w-[120px] flex-col">
                  <span className="text-[13px] font-semibold text-bh-fg-1">
                    {meta.label}
                    {isNativeRow ? (
                      <span className="ml-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-bh-lime">
                        tu idioma
                      </span>
                    ) : null}
                  </span>
                  <span className="font-bh-mono text-[10px] uppercase tracking-[0.14em] text-bh-fg-4">
                    {code}
                  </span>
                </span>

                <span className="relative h-1.5 flex-1 overflow-hidden rounded-bh-pill bg-white/[0.06]">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-bh-pill ${accent} transition-[width] duration-300`}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-9 text-right font-bh-mono text-[11px] text-bh-fg-2">
                  {pct}%
                </span>

                {isEs ? (
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
      <LocaleForm
        key={active}
        locale={active}
        fields={drafts[active]}
        source={drafts[native]}
        sourceLabel={native.toUpperCase()}
        isNative={active === native}
        canDelete={active !== "es"}
        aiProvider={aiProvider}
        onPatch={patch}
        onSave={onSave}
        onDelete={onDelete}
        onGenerate={onGenerate}
        genBlock={genBlock}
        isGenerating={isGenerating}
        isSaving={isSaving}
        published={available.includes(active)}
        feedback={feedback}
      />
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

function blockHasContent(fields: LocaleFields, block: Block): boolean {
  return BLOCK_FIELDS[block].some((k) => {
    const v = fields[k];
    return Array.isArray(v) ? v.length > 0 : v.trim().length > 0;
  });
}

// Brand glyph of the model powering the assistant (Gemini today). Falls back
// to the generic sparkle when the configured model maps to no known provider.
function AssistGlyph({ provider }: { provider: AiProvider }) {
  if (provider === "gemini" || provider === "claude") {
    const src =
      provider === "gemini" ? "/brands/gemini-icon.svg" : "/brands/claude-icon.svg";
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tiny static brand glyph; no optimization needed
      <img src={src} alt="" aria-hidden width={14} height={14} className="size-3.5 shrink-0" />
    );
  }
  return <Sparkles className="size-3.5" />;
}

function AssistButton({
  block,
  hasContent,
  loading,
  disabled,
  provider,
  onGenerate,
}: {
  block: Block;
  hasContent: boolean;
  loading: boolean;
  disabled: boolean;
  provider: AiProvider;
  onGenerate: (block: Block, force: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="flat"
        startContent={loading ? undefined : <AssistGlyph provider={provider} />}
        isLoading={loading}
        isDisabled={disabled}
        onPress={() => onGenerate(block, false)}
        className="bg-bh-lime/[0.10] text-bh-lime hover:bg-bh-lime/[0.18]"
      >
        Auto-completar
      </Button>
      {hasContent ? (
        <Button
          size="sm"
          variant="light"
          isIconOnly
          isDisabled={disabled || loading}
          onPress={() => onGenerate(block, true)}
          aria-label="Regenerar otra versión"
          className="text-bh-fg-3"
        >
          <RefreshCw className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

function LocaleForm({
  locale,
  fields,
  source,
  sourceLabel,
  isNative,
  canDelete,
  aiProvider,
  onPatch,
  onSave,
  onDelete,
  onGenerate,
  genBlock,
  isGenerating,
  isSaving,
  published,
  feedback,
}: {
  locale: AnyLocale;
  fields: LocaleFields;
  source: LocaleFields;
  sourceLabel: string;
  isNative: boolean;
  canDelete: boolean;
  aiProvider: AiProvider;
  onPatch: (field: keyof LocaleFields, value: string | string[]) => void;
  onSave: () => void;
  onDelete: () => void;
  onGenerate: (block: Block, force: boolean) => void;
  genBlock: Block | null;
  isGenerating: boolean;
  isSaving: boolean;
  published: boolean;
  feedback: { type: "success" | "danger"; message: string } | null;
}) {
  const localeLabel = LOCALE_META[locale]?.label ?? locale;
  const busy = isSaving || isGenerating;

  const renderField = (key: keyof LocaleFields) => {
    const meta = LABELS[key];
    // The source-language reference, shown to help while translating. Hidden
    // on the native tab — there it IS the source.
    const sourceHint = isNative
      ? undefined
      : Array.isArray(source[key])
        ? (source[key] as string[]).join(" · ")
        : (source[key] as string);
    const description = sourceHint ? `${sourceLabel}: ${sourceHint}` : undefined;
    if (key === "topCharacteristics") {
      return (
        <FormField
          key={key}
          as="textarea"
          id={`${locale}-${key}`}
          label={meta.label}
          rows={4}
          value={(fields.topCharacteristics ?? []).join("\n")}
          description={description}
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
        description={description}
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
        description={
          isNative
            ? "Tu idioma nativo: escribí libremente. Desde acá el asistente traduce hacia los demás idiomas."
            : "Traducí cada campo o autocompletá desde tu idioma; siempre podés editar antes de guardar."
        }
        actions={
          isNative ? undefined : (
            <AssistButton
              block="bio"
              hasContent={blockHasContent(fields, "bio")}
              loading={isGenerating && genBlock === "bio"}
              disabled={busy}
              provider={aiProvider}
              onGenerate={onGenerate}
            />
          )
        }
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
        actions={
          isNative ? undefined : (
            <AssistButton
              block="scouting"
              hasContent={blockHasContent(fields, "scouting")}
              loading={isGenerating && genBlock === "scouting"}
              disabled={busy}
              provider={aiProvider}
              onGenerate={onGenerate}
            />
          )
        }
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
            {canDelete && published ? (
              <Button
                variant="light"
                size="sm"
                startContent={<Trash2 className="size-4" />}
                onPress={onDelete}
                isDisabled={busy}
                className="text-bh-fg-3"
              >
                Quitar idioma
              </Button>
            ) : null}
            <Button
              color="primary"
              startContent={<Save className="size-4" />}
              onPress={onSave}
              isLoading={isSaving}
              isDisabled={busy}
            >
              Guardar versión {locale.toUpperCase()}
            </Button>
          </div>
        </div>
      </SectionCard>

      {isNative ? (
        <p className="px-1 text-[11px] leading-[1.5] text-bh-fg-4">
          {locale === "es"
            ? "El español es tu contenido canónico: se publica en tu perfil principal apenas guardás."
            : "Guardá tu versión nativa antes de autocompletar los otros idiomas — el asistente traduce desde lo último que guardaste."}
        </p>
      ) : (
        <p className="px-1 text-[11px] leading-[1.5] text-bh-fg-4">
          Las versiones autocompletadas son borradores: nada se publica hasta que
          tocás «Guardar». Tenés hasta 40 regeneraciones por mes; la primera
          traducción de cada bloque no cuenta.
        </p>
      )}
    </>
  );
}
