"use client";

import { useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { Check, Globe, RefreshCw, Save, Sparkles, Trash2, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

import SectionCard from "@/components/dashboard/client/SectionCard";
import FormField from "@/components/dashboard/client/FormField";
import {
  savePlayerTranslation,
  deletePlayerTranslation,
  generateTranslationDraft,
  saveHonourTranslation,
  deleteHonourTranslation,
  generateHonourTranslationDraft,
  type TranslationFields,
  type HonourTranslationFields,
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

// Palmarés (honours). Base lives in es (football-data); en/it/pt are translated
// here, driven by the same active-locale selector as the rest of the editor.
type HonourFields = { title: string; competition: string; description: string };
type HonourTr = {
  title: string | null;
  competition: string | null;
  description: string | null;
};
export type EditorHonour = {
  id: string;
  title: string;
  competition: string | null;
  season: string | null;
  description: string | null;
  translations: Partial<Record<EditableLocale, HonourTr>>;
};
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

function filled(v: string | string[] | undefined): boolean {
  return Array.isArray(v) ? v.length > 0 : (v ?? "").trim().length > 0;
}

export default function TranslationsEditor({
  playerId,
  baseEs,
  translations,
  initialAvailable,
  aiProvider,
  honours,
}: {
  playerId: string;
  baseEs: LocaleFields;
  translations: Partial<Record<EditableLocale, LocaleFields>>;
  initialAvailable: string[];
  aiProvider: AiProvider;
  honours: EditorHonour[];
}) {
  const t = useTranslations("dashEditProfile");
  // es is the canonical base: the 8 fields are written in es in Football data
  // and the honours come from there too. This editor ONLY translates into
  // en/it/pt — you can't edit/stand on es here (it's the source).
  const [active, setActive] = useState<EditableLocale>("en");
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

  // Palmarés: saved translations per honour per locale. Client source of truth
  // so a save survives locale switches (rows re-read from here, not the prop).
  const [honourSaved, setHonourSaved] = useState<
    Record<string, Partial<Record<EditableLocale, HonourTr>>>
  >(() => Object.fromEntries(honours.map((h) => [h.id, { ...h.translations }])));

  function handleHonourSaved(
    honourId: string,
    loc: EditableLocale,
    tr: HonourTr,
  ) {
    setHonourSaved((prev) => ({
      ...prev,
      [honourId]: { ...prev[honourId], [loc]: tr },
    }));
  }
  function handleHonourDeleted(honourId: string, loc: EditableLocale) {
    setHonourSaved((prev) => {
      const next = { ...(prev[honourId] ?? {}) };
      delete next[loc];
      return { ...prev, [honourId]: next };
    });
  }

  // Completeness is RELATIVE to the es base: a locale that mirrors everything
  // es has reads 100%. Units = es-present fields + honours. es itself = 100%
  // (the source). For a target, a honour counts once it has a saved translation.
  const baseFieldKeys = FIELD_KEYS.filter((k) => filled(baseEs[k]));
  const totalUnits = baseFieldKeys.length + honours.length;

  function localeCompleteness(code: AnyLocale): number {
    if (code === "es") return 100;
    if (totalUnits === 0) return 0;
    const fieldsDone = baseFieldKeys.filter((k) => filled(drafts[code][k])).length;
    const honoursDone = honours.filter((h) => {
      const tr = honourSaved[h.id]?.[code as EditableLocale];
      return !!(tr && (tr.title || tr.competition || tr.description));
    }).length;
    return Math.round(((fieldsDone + honoursDone) / totalUnits) * 100);
  }

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
      {/* ---------- Overview: es base (source) + editable targets ---------- */}
      <SectionCard
        title={t("translationsEditor.overviewTitle")}
        description={t("translationsEditor.overviewDescription")}
      >
        <div className="grid gap-2">
          {BASE_ORDER.map((code) => {
            const meta = LOCALE_META[code];
            const pct = localeCompleteness(code);
            const isEs = code === "es";
            const published = available.includes(code);
            const accent =
              pct === 100 ? "bg-bh-lime" : pct > 0 ? "bg-bh-blue" : "bg-white/15";

            const inner = (
              <>
                <span className="text-base leading-none" aria-hidden>
                  {meta.flag}
                </span>
                <span className="flex min-w-[112px] flex-col">
                  <span className="text-[13px] font-semibold text-bh-fg-1">
                    {meta.label}
                  </span>
                  <span className="font-bh-mono text-[10px] uppercase tracking-[0.14em] text-bh-fg-4">
                    {isEs ? t("translationsEditor.baseSource") : code}
                  </span>
                </span>

                <span className="relative h-1.5 min-w-[48px] flex-1 overflow-hidden rounded-bh-pill bg-white/[0.08]">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-bh-pill ${accent} transition-[width] duration-300`}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-9 shrink-0 text-right font-bh-mono text-[11px] text-bh-fg-2">
                  {pct}%
                </span>

                {isEs ? (
                  <Chip size="sm" variant="flat" className="shrink-0 bg-white/[0.06] text-bh-fg-3">
                    {t("translationsEditor.chipBase")}
                  </Chip>
                ) : published ? (
                  <Chip
                    size="sm"
                    variant="flat"
                    startContent={<Check className="size-3" />}
                    className="shrink-0 bg-bh-lime/[0.12] text-bh-lime"
                  >
                    {t("translationsEditor.chipPublished")}
                  </Chip>
                ) : (
                  <Chip size="sm" variant="flat" className="shrink-0 bg-white/[0.06] text-bh-fg-4">
                    {t("translationsEditor.chipUnpublished")}
                  </Chip>
                )}
              </>
            );

            // es is the source — edited in Football data, not selectable here.
            if (code === "es") {
              return (
                <div
                  key={code}
                  className="flex items-center gap-3 rounded-bh-md border border-dashed border-white/[0.1] bg-bh-surface-1/50 px-3 py-2.5"
                  title={t("translationsEditor.esEditedInFootballData")}
                >
                  {inner}
                </div>
              );
            }

            const isActive = code === active;
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
                {inner}
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
        source={baseEs}
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

      {/* ---------- Palmarés (same active locale) ---------- */}
      <HonoursBlock
        locale={active}
        honours={honours}
        playerId={playerId}
        saved={honourSaved}
        aiProvider={aiProvider}
        onSaved={handleHonourSaved}
        onDeleted={handleHonourDeleted}
      />
    </div>
  );
}

// --------------------------- Locale form ---------------------------

// Multiline flag per field; the human label is resolved via t() at render time
// so this stays static while the labels follow the active locale.
const FIELD_MULTILINE: Record<keyof LocaleFields, boolean> = {
  bio: true,
  careerObjectives: true,
  topCharacteristics: true,
  tacticsAnalysis: true,
  physicalAnalysis: true,
  mentalAnalysis: true,
  techniqueAnalysis: true,
  analysisAuthor: false,
};

const FIELD_LABEL_KEY: Record<keyof LocaleFields, string> = {
  bio: "translationsEditor.fieldBio",
  careerObjectives: "translationsEditor.fieldCareerObjectives",
  topCharacteristics: "translationsEditor.fieldTopCharacteristics",
  tacticsAnalysis: "translationsEditor.fieldTacticsAnalysis",
  physicalAnalysis: "translationsEditor.fieldPhysicalAnalysis",
  mentalAnalysis: "translationsEditor.fieldMentalAnalysis",
  techniqueAnalysis: "translationsEditor.fieldTechniqueAnalysis",
  analysisAuthor: "translationsEditor.fieldAnalysisAuthor",
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
  const t = useTranslations("dashEditProfile");
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
        {t("translationsEditor.autoComplete")}
      </Button>
      {hasContent ? (
        <Button
          size="sm"
          variant="light"
          isIconOnly
          isDisabled={disabled || loading}
          onPress={() => onGenerate(block, true)}
          aria-label={t("translationsEditor.regenerate")}
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
  const t = useTranslations("dashEditProfile");
  const localeLabel = LOCALE_META[locale]?.label ?? locale;
  const busy = isSaving || isGenerating;

  const renderField = (key: keyof LocaleFields) => {
    const multiline = FIELD_MULTILINE[key];
    const label = t(FIELD_LABEL_KEY[key]);
    // The es base reference, shown under each field to help while translating.
    const raw = Array.isArray(source[key])
      ? (source[key] as string[]).join(" · ")
      : (source[key] as string);
    const description = raw && raw.trim()
      ? t("translationsEditor.esPrefix", { value: raw })
      : undefined;
    if (key === "topCharacteristics") {
      return (
        <FormField
          key={key}
          as="textarea"
          id={`${locale}-${key}`}
          label={label}
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
        as={multiline ? "textarea" : undefined}
        id={`${locale}-${key}`}
        label={label}
        rows={multiline ? 4 : undefined}
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
            {t("translationsEditor.bioBlockTitle", { locale: localeLabel })}
          </span>
        }
        description={t("translationsEditor.bioBlockDescription")}
        actions={
          <AssistButton
            block="bio"
            hasContent={blockHasContent(fields, "bio")}
            loading={isGenerating && genBlock === "bio"}
            disabled={busy}
            provider={aiProvider}
            onGenerate={onGenerate}
          />
        }
      >
        <div className="grid gap-5">
          {renderField("bio")}
          {renderField("careerObjectives")}
          {renderField("topCharacteristics")}
        </div>
      </SectionCard>

      <SectionCard
        title={t("translationsEditor.scoutingBlockTitle", { locale: localeLabel })}
        description={t("translationsEditor.scoutingBlockDescription")}
        actions={
          <AssistButton
            block="scouting"
            hasContent={blockHasContent(fields, "scouting")}
            loading={isGenerating && genBlock === "scouting"}
            disabled={busy}
            provider={aiProvider}
            onGenerate={onGenerate}
          />
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
            {published ? (
              <Button
                variant="light"
                size="sm"
                startContent={<Trash2 className="size-4" />}
                onPress={onDelete}
                isDisabled={busy}
                className="text-bh-fg-3"
              >
                {t("translationsEditor.removeLanguage")}
              </Button>
            ) : null}
            <Button
              color="primary"
              startContent={<Save className="size-4" />}
              onPress={onSave}
              isLoading={isSaving}
              isDisabled={busy}
            >
              {t("translationsEditor.saveLocale", { locale: locale.toUpperCase() })}
            </Button>
          </div>
        </div>
      </SectionCard>

      <p className="px-1 text-[11px] leading-[1.5] text-bh-fg-4">
        {t("translationsEditor.draftDisclaimer")}
      </p>
    </>
  );
}

// --------------------------- Palmarés block ---------------------------
// Driven by the SAME active locale as the rest of the editor (no own selector).
// es = base (edited in football-data) → reference only. en/it/pt = translation
// inputs with the "Auto-completar" assistant (es → target).

function HonoursBlock({
  locale,
  honours,
  playerId,
  saved,
  aiProvider,
  onSaved,
  onDeleted,
}: {
  locale: AnyLocale;
  honours: EditorHonour[];
  playerId: string;
  saved: Record<string, Partial<Record<EditableLocale, HonourTr>>>;
  aiProvider: AiProvider;
  onSaved: (honourId: string, loc: EditableLocale, tr: HonourTr) => void;
  onDeleted: (honourId: string, loc: EditableLocale) => void;
}) {
  const t = useTranslations("dashEditProfile");
  if (honours.length === 0) return null;

  // es is the base (football-data) — show the logros as reference, nothing to
  // translate here.
  if (locale === "es") {
    return (
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Trophy className="size-4 text-bh-fg-3" />
            {t("translationsEditor.honoursTitle")}
          </span>
        }
        description={t("translationsEditor.honoursDescriptionEs")}
      >
        <div className="grid gap-2">
          {honours.map((h) => {
            const ref = [h.competition, h.season].filter(Boolean).join(" · ");
            return (
              <div
                key={h.id}
                className="rounded-bh-md border border-white/[0.06] bg-bh-surface-1 px-3 py-2"
              >
                <p className="text-[13px] font-semibold text-bh-fg-1">{h.title}</p>
                {ref ? (
                  <p className="font-bh-mono text-[11px] uppercase tracking-[0.1em] text-bh-fg-4">
                    {ref}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </SectionCard>
    );
  }

  const target = locale as EditableLocale;

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Trophy className="size-4 text-bh-blue" />
          {t("translationsEditor.honoursTitleLocale", { locale: LOCALE_META[locale].label })}
        </span>
      }
      description={t("translationsEditor.honoursDescriptionLocale")}
    >
      <div className="grid gap-4">
        {honours.map((h) => (
          <HonourRow
            key={`${h.id}-${target}`}
            playerId={playerId}
            honour={h}
            locale={target}
            initial={saved[h.id]?.[target]}
            aiProvider={aiProvider}
            onSaved={(tr) => onSaved(h.id, target, tr)}
            onDeleted={() => onDeleted(h.id, target)}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function HonourRow({
  playerId,
  honour,
  locale,
  initial,
  aiProvider,
  onSaved,
  onDeleted,
}: {
  playerId: string;
  honour: EditorHonour;
  locale: EditableLocale;
  initial: HonourTr | undefined;
  aiProvider: AiProvider;
  onSaved: (tr: HonourTr) => void;
  onDeleted: () => void;
}) {
  const t = useTranslations("dashEditProfile");
  const [draft, setDraft] = useState<HonourFields>({
    title: initial?.title ?? "",
    competition: initial?.competition ?? "",
    description: initial?.description ?? "",
  });
  const [published, setPublished] = useState(!!initial);
  const [feedback, setFeedback] = useState<
    { type: "success" | "danger"; message: string } | null
  >(null);
  const [isSaving, start] = useTransition();
  const [isGenerating, startGen] = useTransition();
  const busy = isSaving || isGenerating;

  const hasContent =
    draft.title.trim() !== "" ||
    draft.competition.trim() !== "" ||
    draft.description.trim() !== "";
  const reference = [honour.competition, honour.season]
    .filter(Boolean)
    .join(" · ");

  function patch(field: keyof HonourFields, value: string) {
    setDraft((p) => ({ ...p, [field]: value }));
    setFeedback(null);
  }

  function onGenerate(force: boolean) {
    startGen(async () => {
      const res = await generateHonourTranslationDraft({
        playerId,
        honourId: honour.id,
        locale,
        force,
      });
      if (!res.success) {
        setFeedback({ type: "danger", message: res.message });
        return;
      }
      if (res.draft) {
        const d = res.draft as Partial<HonourFields>;
        setDraft((p) => ({
          title: d.title ?? p.title,
          competition: d.competition ?? p.competition,
          description: d.description ?? p.description,
        }));
      }
      setFeedback({ type: "success", message: res.message });
    });
  }

  function onSave() {
    start(async () => {
      const res = await saveHonourTranslation({
        playerId,
        honourId: honour.id,
        locale,
        fields: draft as HonourTranslationFields,
      });
      setFeedback({ type: res.success ? "success" : "danger", message: res.message });
      if (res.success) {
        setPublished(true);
        onSaved({
          title: draft.title.trim() || null,
          competition: draft.competition.trim() || null,
          description: draft.description.trim() || null,
        });
      }
    });
  }

  function onDelete() {
    start(async () => {
      const res = await deleteHonourTranslation({ playerId, honourId: honour.id, locale });
      setFeedback({ type: res.success ? "success" : "danger", message: res.message });
      if (res.success) {
        setPublished(false);
        setDraft({ title: "", competition: "", description: "" });
        onDeleted();
      }
    });
  }

  return (
    <div className="rounded-bh-md border border-white/[0.08] bg-bh-surface-1 p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-bh-fg-1">{honour.title}</p>
          {reference ? (
            <p className="font-bh-mono text-[11px] uppercase tracking-[0.1em] text-bh-fg-4">
              {reference}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="flat"
              startContent={isGenerating ? undefined : <AssistGlyph provider={aiProvider} />}
              isLoading={isGenerating}
              isDisabled={busy}
              onPress={() => onGenerate(false)}
              className="bg-bh-lime/[0.10] text-bh-lime hover:bg-bh-lime/[0.18]"
            >
              {t("translationsEditor.autoComplete")}
            </Button>
            {hasContent ? (
              <Button
                size="sm"
                variant="light"
                isIconOnly
                isDisabled={busy}
                onPress={() => onGenerate(true)}
                aria-label={t("translationsEditor.regenerate")}
                className="text-bh-fg-3"
              >
                <RefreshCw className="size-3.5" />
              </Button>
            ) : null}
          </div>
          {published ? (
            <Chip
              size="sm"
              variant="flat"
              startContent={<Check className="size-3" />}
              className="bg-bh-lime/[0.12] text-bh-lime"
            >
              {t("translationsEditor.chipTranslated")}
            </Chip>
          ) : (
            <Chip size="sm" variant="flat" className="bg-white/[0.06] text-bh-fg-4">
              {t("translationsEditor.chipUntranslated")}
            </Chip>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <FormField
          id={`${honour.id}-${locale}-title`}
          label={t("translationsEditor.honourTitleLabel")}
          value={draft.title}
          description={t("translationsEditor.esPrefix", { value: honour.title })}
          onValueChange={(v) => patch("title", v)}
        />
        <FormField
          id={`${honour.id}-${locale}-competition`}
          label={t("translationsEditor.honourCompetitionLabel")}
          value={draft.competition}
          description={honour.competition ? t("translationsEditor.esPrefix", { value: honour.competition }) : undefined}
          onValueChange={(v) => patch("competition", v)}
        />
        <FormField
          as="textarea"
          rows={3}
          id={`${honour.id}-${locale}-description`}
          label={t("translationsEditor.honourDescriptionLabel")}
          value={draft.description}
          description={honour.description ? t("translationsEditor.esPrefix", { value: honour.description }) : undefined}
          onValueChange={(v) => patch("description", v)}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.06] pt-3 sm:flex-row sm:items-center sm:justify-between">
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
              isDisabled={busy}
              className="text-bh-fg-3"
            >
              {t("translationsEditor.remove")}
            </Button>
          ) : null}
          <Button
            color="primary"
            size="sm"
            startContent={<Save className="size-4" />}
            onPress={onSave}
            isLoading={isSaving}
            isDisabled={busy}
          >
            {t("translationsEditor.saveLocaleShort", { locale: locale.toUpperCase() })}
          </Button>
        </div>
      </div>
    </div>
  );
}
