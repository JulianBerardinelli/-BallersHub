"use client";

import { useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { Check, ImageIcon, Languages, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import SectionCard from "@/components/dashboard/client/SectionCard";
import FormField from "@/components/dashboard/client/FormField";
import {
  saveAgencyMediaTranslation,
  deleteAgencyMediaTranslation,
} from "@/app/actions/agency-translations";

type TargetLocale = "en" | "it" | "pt";

const LOCALES: { code: TargetLocale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
];

export type AgencyMediaItem = {
  id: string;
  url: string;
  title: string | null;
  altText: string | null;
};

export type MediaTranslationFields = {
  title: string | null;
  altText: string | null;
};

export default function AgencyMediaTranslationsSection({
  agencyId,
  mediaItems,
  translations,
}: {
  agencyId: string;
  mediaItems: AgencyMediaItem[];
  translations: Record<string, Partial<Record<TargetLocale, MediaTranslationFields>>>;
}) {
  const t = useTranslations("dashAgency");
  const [active, setActive] = useState<TargetLocale>("en");

  // Saved-state lives here so a save survives switching the active locale tab
  // (same lesson as the honours editor: parent owns the truth, not the row).
  const [saved, setSaved] = useState<
    Record<string, Partial<Record<TargetLocale, MediaTranslationFields>>>
  >(() => {
    const seed: Record<string, Partial<Record<TargetLocale, MediaTranslationFields>>> = {};
    for (const m of mediaItems) {
      seed[m.id] = { ...(translations[m.id] ?? {}) };
    }
    return seed;
  });

  function handleSaved(mediaId: string, loc: TargetLocale, tr: MediaTranslationFields) {
    setSaved((prev) => ({
      ...prev,
      [mediaId]: { ...(prev[mediaId] ?? {}), [loc]: tr },
    }));
  }
  function handleDeleted(mediaId: string, loc: TargetLocale) {
    setSaved((prev) => {
      const next = { ...(prev[mediaId] ?? {}) };
      delete next[loc];
      return { ...prev, [mediaId]: next };
    });
  }

  if (mediaItems.length === 0) {
    return (
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Languages className="size-4 text-bh-blue" />
            {t("mediaTranslations.title")}
          </span>
        }
        description={t("mediaTranslations.description")}
      >
        <p className="text-sm text-bh-fg-3">{t("mediaTranslations.empty")}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Languages className="size-4 text-bh-blue" />
          {t("mediaTranslations.title")}
        </span>
      }
      description={t("mediaTranslations.description")}
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {LOCALES.map((l) => {
          const isActive = l.code === active;
          const anySaved = mediaItems.some((m) => saved[m.id]?.[l.code]);
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
              {anySaved ? <Check className="size-3.5 text-bh-lime" aria-hidden /> : null}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4">
        {mediaItems.map((m) => (
          <MediaRow
            key={`${m.id}-${active}`}
            agencyId={agencyId}
            media={m}
            locale={active}
            initial={saved[m.id]?.[active]}
            onSaved={(tr) => handleSaved(m.id, active, tr)}
            onDeleted={() => handleDeleted(m.id, active)}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function MediaRow({
  agencyId,
  media,
  locale,
  initial,
  onSaved,
  onDeleted,
}: {
  agencyId: string;
  media: AgencyMediaItem;
  locale: TargetLocale;
  initial: MediaTranslationFields | undefined;
  onSaved: (tr: MediaTranslationFields) => void;
  onDeleted: () => void;
}) {
  const t = useTranslations("dashAgency");
  const [draft, setDraft] = useState<{ title: string; altText: string }>({
    title: initial?.title ?? "",
    altText: initial?.altText ?? "",
  });
  const [published, setPublished] = useState(!!initial);
  const [feedback, setFeedback] = useState<
    { type: "success" | "danger"; message: string } | null
  >(null);
  const [isSaving, start] = useTransition();

  function patch(field: "title" | "altText", value: string) {
    setDraft((p) => ({ ...p, [field]: value }));
    setFeedback(null);
  }

  function onSave() {
    start(async () => {
      const res = await saveAgencyMediaTranslation({
        agencyId,
        mediaId: media.id,
        locale,
        fields: { title: draft.title, altText: draft.altText },
      });
      setFeedback({
        type: res.success ? "success" : "danger",
        message: res.success ? t("mediaTranslations.successSaved") : res.message,
      });
      if (res.success) {
        setPublished(true);
        onSaved({
          title: draft.title.trim() || null,
          altText: draft.altText.trim() || null,
        });
      }
    });
  }

  function onDelete() {
    start(async () => {
      const res = await deleteAgencyMediaTranslation({
        agencyId,
        mediaId: media.id,
        locale,
      });
      setFeedback({
        type: res.success ? "success" : "danger",
        message: res.success ? t("mediaTranslations.successDeleted") : res.message,
      });
      if (res.success) {
        setPublished(false);
        setDraft({ title: "", altText: "" });
        onDeleted();
      }
    });
  }

  return (
    <div className="rounded-bh-md border border-white/[0.08] bg-bh-surface-1 p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-bh-md border border-white/[0.06] bg-bh-surface-1">
            {media.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- small inline preview
              <img
                src={media.url}
                alt=""
                aria-hidden
                width={64}
                height={64}
                className="size-full object-cover"
                loading="lazy"
              />
            ) : (
              <ImageIcon className="size-5 text-bh-fg-4" aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-bh-fg-1">
              {media.title || t("mediaTranslations.untitled")}
            </p>
            {media.altText ? (
              <p className="font-bh-mono text-[11px] uppercase tracking-[0.1em] text-bh-fg-4">
                {media.altText}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {published ? (
            <Chip
              size="sm"
              variant="flat"
              startContent={<Check className="size-3" />}
              className="bg-bh-lime/[0.12] text-bh-lime"
            >
              {t("mediaTranslations.chipTranslated")}
            </Chip>
          ) : (
            <Chip size="sm" variant="flat" className="bg-white/[0.06] text-bh-fg-4">
              {t("mediaTranslations.chipUntranslated")}
            </Chip>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        <FormField
          id={`agency-media-${media.id}-${locale}-title`}
          label={t("mediaTranslations.titleLabel")}
          value={draft.title}
          description={
            media.title
              ? t("mediaTranslations.esPrefix", { value: media.title })
              : undefined
          }
          onValueChange={(v) => patch("title", v)}
        />
        <FormField
          as="textarea"
          rows={2}
          id={`agency-media-${media.id}-${locale}-alt`}
          label={t("mediaTranslations.altLabel")}
          value={draft.altText}
          description={
            media.altText
              ? t("mediaTranslations.esPrefix", { value: media.altText })
              : undefined
          }
          onValueChange={(v) => patch("altText", v)}
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
              {t("mediaTranslations.remove")}
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
            {t("mediaTranslations.saveLocaleShort", {
              locale: locale.toUpperCase(),
            })}
          </Button>
        </div>
      </div>
    </div>
  );
}
