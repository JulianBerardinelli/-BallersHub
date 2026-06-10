"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { Check, Globe, Languages, RefreshCw, Save, Sparkles, Trash2, Trophy } from "lucide-react";
import { useLocale } from "next-intl";

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
import { setPreferredLocale } from "../../../settings/account/actions";

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
  honours,
}: {
  playerId: string;
  baseEs: LocaleFields;
  translations: Partial<Record<EditableLocale, LocaleFields>>;
  initialAvailable: string[];
  preferredLocale: string;
  aiProvider: AiProvider;
  honours: EditorHonour[];
}) {
  // The player's native language leads the list and is the source the AI
  // assistant translates FROM (model B1). es stays the canonical /slug. It's
  // state so the "write in your language?" prompt can switch it in place.
  const uiLocale = useLocale();
  const [native, setNative] = useState<AnyLocale>(normalizeLocale(preferredLocale));
  const orderedLocales: AnyLocale[] = [
    native,
    ...BASE_ORDER.filter((l) => l !== native),
  ];

  const [active, setActive] = useState<AnyLocale>(normalizeLocale(preferredLocale));
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

  // First-visit nudge: if the player browses in another language but their
  // native is still es (the default), offer to switch — catches users the
  // sign-up auto-seed missed. localStorage-gated so it asks at most once.
  const promptLocale: EditableLocale | null =
    uiLocale === "en" || uiLocale === "it" || uiLocale === "pt" ? uiLocale : null;
  const [promptReady, setPromptReady] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [isSettingNative, startSetNative] = useTransition();
  useEffect(() => {
    setPromptReady(true);
    try {
      if (localStorage.getItem(`bh:nativePrompt:${playerId}`) === "1") {
        setPromptDismissed(true);
      }
    } catch {}
  }, [playerId]);
  const showNativePrompt =
    promptReady && !promptDismissed && native === "es" && promptLocale !== null;

  function rememberPromptHandled() {
    setPromptDismissed(true);
    try {
      localStorage.setItem(`bh:nativePrompt:${playerId}`, "1");
    } catch {}
  }

  function acceptNative() {
    if (!promptLocale) return;
    const loc = promptLocale;
    startSetNative(async () => {
      const res = await setPreferredLocale({ locale: loc });
      if (res.success) {
        setNative(loc);
        setActive(loc);
        rememberPromptHandled();
      } else {
        setFeedback({ type: "danger", message: res.message });
      }
    });
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
      {showNativePrompt && promptLocale ? (
        <div className="flex flex-col gap-3 rounded-bh-md border border-bh-blue/30 bg-bh-blue/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Languages className="mt-0.5 size-4 shrink-0 text-bh-blue" />
            <p className="text-[13px] leading-[1.5] text-bh-fg-2">
              Estás navegando en{" "}
              <span className="font-semibold text-bh-fg-1">
                {LOCALE_META[promptLocale].label}
              </span>
              . ¿Escribís tu perfil en ese idioma? Lo ponemos como tu idioma
              nativo y traducimos el resto —incluido el español canónico— desde
              ahí.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="light"
              onPress={rememberPromptHandled}
              isDisabled={isSettingNative}
              className="text-bh-fg-3"
            >
              No, en español
            </Button>
            <Button
              size="sm"
              color="primary"
              onPress={acceptNative}
              isLoading={isSettingNative}
              isDisabled={isSettingNative}
            >
              Sí, {LOCALE_META[promptLocale].label}
            </Button>
          </div>
        </div>
      ) : null}

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
  if (honours.length === 0) return null;

  // es is the base (football-data) — show the logros as reference, nothing to
  // translate here.
  if (locale === "es") {
    return (
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Trophy className="size-4 text-bh-fg-3" />
            Palmarés
          </span>
        }
        description="El palmarés se carga en español desde Football data. Elegí otro idioma arriba para traducir cada logro."
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
          Palmarés · {LOCALE_META[locale].label}
        </span>
      }
      description="Traducí cada logro o autocompletá desde el español; podés editar antes de guardar. Se guarda logro por logro."
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
              Auto-completar
            </Button>
            {hasContent ? (
              <Button
                size="sm"
                variant="light"
                isIconOnly
                isDisabled={busy}
                onPress={() => onGenerate(true)}
                aria-label="Regenerar otra versión"
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
              traducido
            </Chip>
          ) : (
            <Chip size="sm" variant="flat" className="bg-white/[0.06] text-bh-fg-4">
              sin traducir
            </Chip>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <FormField
          id={`${honour.id}-${locale}-title`}
          label="Título del logro"
          value={draft.title}
          description={`ES: ${honour.title}`}
          onValueChange={(v) => patch("title", v)}
        />
        <FormField
          id={`${honour.id}-${locale}-competition`}
          label="Competición"
          value={draft.competition}
          description={honour.competition ? `ES: ${honour.competition}` : undefined}
          onValueChange={(v) => patch("competition", v)}
        />
        <FormField
          as="textarea"
          rows={3}
          id={`${honour.id}-${locale}-description`}
          label="Descripción"
          value={draft.description}
          description={honour.description ? `ES: ${honour.description}` : undefined}
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
              Quitar
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
            Guardar {locale.toUpperCase()}
          </Button>
        </div>
      </div>
    </div>
  );
}
