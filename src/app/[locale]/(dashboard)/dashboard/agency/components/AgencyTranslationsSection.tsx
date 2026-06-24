"use client";

import { useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { Check, Languages, Lock, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import SectionCard from "@/components/dashboard/client/SectionCard";
import FormField from "@/components/dashboard/client/FormField";
import {
  saveAgencyTranslation,
  deleteAgencyTranslation,
  type AgencyTranslationFields,
} from "@/app/actions/agency-translations";
import { useAgencyLocaleCap } from "./AgencyLocaleCapContext";

type TargetLocale = "en" | "it" | "pt" | "de" | "fr" | "fi";
type Fields = { description: string; tagline: string };

const LOCALES: { code: TargetLocale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "fi", label: "Suomi", flag: "🇫🇮" },
];

export default function AgencyTranslationsSection({
  agencyId,
  base,
  translations,
}: {
  agencyId: string;
  base: { description: string; tagline: string };
  translations: Partial<Record<TargetLocale, { description: string | null; tagline: string | null }>>;
}) {
  const t = useTranslations("dashAgency");
  // Cap is shared across the four agency sections (see AgencyLocaleCapContext)
  // so the live swap stays in sync. This section is a WRITER: saving/deleting
  // creates/drops the agency_profile_translations row, so it notifies the cap.
  const { capReached, maxNonEs, isLocked, firstPublished, markPublished, markUnpublished } =
    useAgencyLocaleCap();
  // Open on a language that's already published when there is one, so a capped
  // agency never lands on a locked (un-selectable) tab.
  const [active, setActive] = useState<TargetLocale>(() => firstPublished ?? "en");

  // All per-locale drafts live here (no remount on locale switch), so edits and
  // saves survive switching tabs.
  const [drafts, setDrafts] = useState<Record<TargetLocale, Fields>>(() => ({
    en: {
      description: translations.en?.description ?? "",
      tagline: translations.en?.tagline ?? "",
    },
    it: {
      description: translations.it?.description ?? "",
      tagline: translations.it?.tagline ?? "",
    },
    pt: {
      description: translations.pt?.description ?? "",
      tagline: translations.pt?.tagline ?? "",
    },
    de: {
      description: translations.de?.description ?? "",
      tagline: translations.de?.tagline ?? "",
    },
    fr: {
      description: translations.fr?.description ?? "",
      tagline: translations.fr?.tagline ?? "",
    },
    fi: {
      description: translations.fi?.description ?? "",
      tagline: translations.fi?.tagline ?? "",
    },
  }));
  const [savedLocales, setSavedLocales] = useState<Set<TargetLocale>>(
    () =>
      new Set(
        (["en", "it", "pt", "de", "fr", "fi"] as TargetLocale[]).filter(
          (l) => translations[l],
        ),
      ),
  );
  const [feedback, setFeedback] = useState<
    { type: "success" | "danger"; message: string } | null
  >(null);
  const [isSaving, start] = useTransition();

  const draft = drafts[active];

  function patch(field: keyof Fields, value: string) {
    setDrafts((prev) => ({ ...prev, [active]: { ...prev[active], [field]: value } }));
    setFeedback(null);
  }

  function onSave() {
    const locale = active;
    start(async () => {
      const res = await saveAgencyTranslation({
        agencyId,
        locale,
        fields: drafts[locale] as AgencyTranslationFields,
      });
      setFeedback({ type: res.success ? "success" : "danger", message: res.message });
      if (res.success) {
        setSavedLocales((s) => new Set(s).add(locale));
        markPublished(locale); // this locale now has a row → counts against cap
      }
    });
  }

  function onDelete() {
    const locale = active;
    start(async () => {
      const res = await deleteAgencyTranslation({ agencyId, locale });
      setFeedback({ type: res.success ? "success" : "danger", message: res.message });
      if (res.success) {
        setSavedLocales((s) => {
          const next = new Set(s);
          next.delete(locale);
          return next;
        });
        markUnpublished(locale); // row deleted → frees a slot across all sections
        setDrafts((prev) => ({ ...prev, [locale]: { description: "", tagline: "" } }));
      }
    });
  }

  const published = savedLocales.has(active);

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Languages className="size-4 text-bh-blue" />
          {t("translationsSection.title")}
        </span>
      }
      description={t("translationsSection.description")}
    >
      {capReached ? (
        <div className="mb-4 flex items-start gap-2 rounded-bh-md border border-bh-blue/30 bg-bh-blue/[0.06] px-3 py-2.5 text-[12px] leading-[1.5] text-bh-fg-2">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-bh-blue" aria-hidden />
          <span>
            <span className="font-semibold text-bh-fg-1">
              {t("translationsSection.limitBannerTitle", { max: maxNonEs })}
            </span>{" "}
            {t("translationsSection.limitBannerHint")}
          </span>
        </div>
      ) : null}
      <div className="mb-5 flex flex-wrap gap-2">
        {LOCALES.map((l) => {
          const isActive = l.code === active;
          const isSaved = savedLocales.has(l.code);
          const locked = isLocked(l.code);
          if (locked) {
            return (
              <button
                key={l.code}
                type="button"
                disabled
                title={t("translationsSection.lockedHint")}
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-bh-md border border-dashed border-white/[0.08] bg-bh-surface-1 px-3.5 py-2 text-[13px] font-semibold text-bh-fg-4 opacity-55"
              >
                <span aria-hidden>{l.flag}</span>
                {l.label}
                <Lock className="size-3.5 text-bh-fg-4" aria-hidden />
              </button>
            );
          }
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setActive(l.code);
                setFeedback(null);
              }}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-2 rounded-bh-md border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                isActive
                  ? "border-bh-lime/40 bg-bh-lime/[0.08] text-bh-fg-1"
                  : "border-white/[0.08] bg-bh-surface-1 text-bh-fg-3 hover:border-white/[0.18]"
              }`}
            >
              <span aria-hidden>{l.flag}</span>
              {l.label}
              {isSaved ? <Check className="size-3.5 text-bh-lime" aria-hidden /> : null}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5">
        <FormField
          as="textarea"
          rows={5}
          id={`agency-${active}-description`}
          label={t("translationsSection.descriptionLabel")}
          value={draft.description}
          description={base.description ? t("translationsSection.esPrefix", { value: base.description }) : undefined}
          onValueChange={(v) => patch("description", v)}
        />
        <FormField
          id={`agency-${active}-tagline`}
          label={t("translationsSection.taglineLabel")}
          value={draft.tagline}
          description={base.tagline ? t("translationsSection.esPrefix", { value: base.tagline }) : undefined}
          onValueChange={(v) => patch("tagline", v)}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
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
              {t("translationsSection.removeLanguage")}
            </Button>
          ) : null}
          <Button
            color="primary"
            startContent={<Save className="size-4" />}
            onPress={onSave}
            isLoading={isSaving}
            isDisabled={isSaving}
          >
            {t("translationsSection.saveLocale", { locale: active.toUpperCase() })}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
