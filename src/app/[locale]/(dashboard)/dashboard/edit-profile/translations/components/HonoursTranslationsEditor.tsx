"use client";

import { useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { Check, Save, Trash2, Trophy } from "lucide-react";

import SectionCard from "@/components/dashboard/client/SectionCard";
import FormField from "@/components/dashboard/client/FormField";
import {
  saveHonourTranslation,
  deleteHonourTranslation,
  type HonourTranslationFields,
} from "../actions";

type TargetLocale = "en" | "it" | "pt";

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
  /** Existing translations per target locale (prefills the inputs). */
  translations: Partial<Record<TargetLocale, HonourTr>>;
};

const LOCALES: { code: TargetLocale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
];

export default function HonoursTranslationsEditor({
  playerId,
  honours,
  preferredLocale,
}: {
  playerId: string;
  honours: EditorHonour[];
  preferredLocale: string;
}) {
  const initial = (["en", "it", "pt"] as string[]).includes(preferredLocale)
    ? (preferredLocale as TargetLocale)
    : "en";
  const [active, setActive] = useState<TargetLocale>(initial);

  if (honours.length === 0) {
    return (
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Trophy className="size-4 text-bh-fg-3" />
            Palmarés en otros idiomas
          </span>
        }
        description="Tu palmarés se carga en español desde Football data; acá lo traducís a los idiomas que publicás."
      >
        <p className="text-[13px] text-bh-fg-3">
          Todavía no cargaste logros. Agregalos en{" "}
          <span className="font-semibold text-bh-fg-2">Football data</span> y
          después volvés acá para traducirlos.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Trophy className="size-4 text-bh-blue" />
          Palmarés en otros idiomas
        </span>
      }
      description="El palmarés base está en español (se edita en Football data). Traducí el nombre, la competición y la descripción de cada logro a cada idioma que publicás."
    >
      {/* Target-locale selector (es es la base, no se traduce acá). */}
      <div className="mb-5 flex flex-wrap gap-2">
        {LOCALES.map((l) => {
          const isActive = l.code === active;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setActive(l.code)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-2 rounded-bh-md border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                isActive
                  ? "border-bh-lime/40 bg-bh-lime/[0.08] text-bh-fg-1"
                  : "border-white/[0.08] bg-bh-surface-1 text-bh-fg-3 hover:border-white/[0.18]"
              }`}
            >
              <span aria-hidden>{l.flag}</span>
              {l.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4">
        {honours.map((h) => (
          <HonourRow
            key={`${h.id}-${active}`}
            playerId={playerId}
            honour={h}
            locale={active}
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
}: {
  playerId: string;
  honour: EditorHonour;
  locale: TargetLocale;
}) {
  const existing = honour.translations[locale];
  const [draft, setDraft] = useState({
    title: existing?.title ?? "",
    competition: existing?.competition ?? "",
    description: existing?.description ?? "",
  });
  const [published, setPublished] = useState(!!existing);
  const [feedback, setFeedback] = useState<
    { type: "success" | "danger"; message: string } | null
  >(null);
  const [isSaving, start] = useTransition();

  // es reference line (what the player wrote in football-data).
  const reference = [honour.competition, honour.season]
    .filter(Boolean)
    .join(" · ");

  function patch(field: "title" | "competition" | "description", value: string) {
    setDraft((p) => ({ ...p, [field]: value }));
    setFeedback(null);
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
      if (res.success) setPublished(true);
    });
  }

  function onDelete() {
    start(async () => {
      const res = await deleteHonourTranslation({ playerId, honourId: honour.id, locale });
      setFeedback({ type: res.success ? "success" : "danger", message: res.message });
      if (res.success) {
        setPublished(false);
        setDraft({ title: "", competition: "", description: "" });
      }
    });
  }

  return (
    <div className="rounded-bh-md border border-white/[0.08] bg-bh-surface-1 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-bh-fg-1">{honour.title}</p>
          {reference ? (
            <p className="font-bh-mono text-[11px] uppercase tracking-[0.1em] text-bh-fg-4">
              {reference}
            </p>
          ) : null}
        </div>
        {published ? (
          <Chip
            size="sm"
            variant="flat"
            startContent={<Check className="size-3" />}
            className="shrink-0 bg-bh-lime/[0.12] text-bh-lime"
          >
            traducido
          </Chip>
        ) : (
          <Chip size="sm" variant="flat" className="shrink-0 bg-white/[0.06] text-bh-fg-4">
            sin traducir
          </Chip>
        )}
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
              isDisabled={isSaving}
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
            isDisabled={isSaving}
          >
            Guardar {locale.toUpperCase()}
          </Button>
        </div>
      </div>
    </div>
  );
}
