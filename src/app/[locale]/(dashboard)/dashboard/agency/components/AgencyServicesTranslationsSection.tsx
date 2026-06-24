"use client";

import { useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { Check, Languages, Lock, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import SectionCard from "@/components/dashboard/client/SectionCard";
import FormField from "@/components/dashboard/client/FormField";
import {
  saveServicesTranslation,
  deleteServicesTranslation,
  type AgencyServicesTranslationItem,
} from "@/app/actions/agency-translations";
import { useAgencyLocaleCap } from "./AgencyLocaleCapContext";

type TargetLocale = "en" | "it" | "pt" | "de" | "fr" | "fi";

const LOCALES: { code: TargetLocale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "fi", label: "Suomi", flag: "🇫🇮" },
];

export type ServiceBaseItem = {
  title: string;
  description: string | null;
};
export type ServiceOverrideItem = {
  title?: string;
  description?: string | null;
};

function emptyArrayLike(n: number): ServiceOverrideItem[] {
  return Array.from({ length: n }, () => ({ title: "", description: "" }));
}

function fromOverride(
  base: ServiceBaseItem[],
  override: ServiceOverrideItem[] | undefined,
): ServiceOverrideItem[] {
  const out: ServiceOverrideItem[] = base.map((_, i) => {
    const o = override?.[i];
    return {
      title: o?.title ?? "",
      description: o?.description ?? "",
    };
  });
  return out;
}

export default function AgencyServicesTranslationsSection({
  agencyId,
  services: base,
  translations,
}: {
  agencyId: string;
  services: ServiceBaseItem[];
  translations: Partial<Record<TargetLocale, ServiceOverrideItem[]>>;
}) {
  const t = useTranslations("dashAgency");

  // Shared cap (see AgencyLocaleCapContext). Services is a WRITER: saving creates
  // an agency_profile_translations row, so it notifies the cap on save. Deleting
  // services only nulls the column (the row survives), so it does NOT free a slot.
  const { capReached, maxNonEs, isLocked, firstPublished, markPublished } =
    useAgencyLocaleCap();

  // Open on a published locale so a capped agency never lands on a locked tab.
  const [active, setActive] = useState<TargetLocale>(() => firstPublished ?? "en");

  // All drafts live here so a save/locale-switch never wipes another locale.
  const [drafts, setDrafts] = useState<Record<TargetLocale, ServiceOverrideItem[]>>(
    () => ({
      en: fromOverride(base, translations.en),
      it: fromOverride(base, translations.it),
      pt: fromOverride(base, translations.pt),
      de: fromOverride(base, translations.de),
      fr: fromOverride(base, translations.fr),
      fi: fromOverride(base, translations.fi),
    }),
  );
  const [savedLocales, setSavedLocales] = useState<Set<TargetLocale>>(
    () =>
      new Set(
        (["en", "it", "pt", "de", "fr", "fi"] as TargetLocale[]).filter(
          (l) => translations[l] !== undefined,
        ),
      ),
  );
  const [feedback, setFeedback] = useState<
    { type: "success" | "danger"; message: string } | null
  >(null);
  const [isSaving, start] = useTransition();

  const draft = drafts[active];

  function patch(idx: number, field: "title" | "description", value: string) {
    setDrafts((prev) => {
      const next = { ...prev };
      const arr = [...next[active]];
      arr[idx] = { ...arr[idx], [field]: value };
      next[active] = arr;
      return next;
    });
    setFeedback(null);
  }

  function onSave() {
    const locale = active;
    start(async () => {
      const payload: AgencyServicesTranslationItem[] = drafts[locale].map((d) => ({
        title: d.title?.trim() || undefined,
        description: d.description?.trim() ? d.description.trim() : null,
      }));
      const res = await saveServicesTranslation({
        agencyId,
        locale,
        services: payload,
      });
      setFeedback({
        type: res.success ? "success" : "danger",
        message: res.success ? t("servicesTranslations.successSaved") : res.message,
      });
      if (res.success) {
        setSavedLocales((s) => new Set(s).add(locale));
        markPublished(locale); // services save creates the row → counts against cap
      }
    });
  }

  function onDelete() {
    const locale = active;
    start(async () => {
      const res = await deleteServicesTranslation({ agencyId, locale });
      setFeedback({
        type: res.success ? "success" : "danger",
        message: res.success ? t("servicesTranslations.successDeleted") : res.message,
      });
      if (res.success) {
        setSavedLocales((s) => {
          const next = new Set(s);
          next.delete(locale);
          return next;
        });
        setDrafts((prev) => ({ ...prev, [locale]: emptyArrayLike(base.length) }));
      }
    });
  }

  const published = savedLocales.has(active);

  if (base.length === 0) {
    return (
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Languages className="size-4 text-bh-blue" />
            {t("servicesTranslations.title")}
          </span>
        }
        description={t("servicesTranslations.description")}
      >
        <p className="text-sm text-bh-fg-3">{t("servicesTranslations.empty")}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Languages className="size-4 text-bh-blue" />
          {t("servicesTranslations.title")}
        </span>
      }
      description={t("servicesTranslations.description")}
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
          if (isLocked(l.code)) {
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

      <div className="grid gap-4">
        {base.map((srv, idx) => (
          <div
            key={idx}
            className="rounded-bh-md border border-white/[0.08] bg-bh-surface-1 p-4"
          >
            <div className="mb-3">
              <p className="text-[13px] font-semibold text-bh-fg-1">
                {srv.title || `#${idx + 1}`}
              </p>
              {srv.description ? (
                <p className="mt-1 text-[12px] leading-[1.5] text-bh-fg-4">
                  {srv.description}
                </p>
              ) : null}
            </div>
            <div className="grid gap-3">
              <FormField
                id={`agency-srv-${active}-${idx}-title`}
                label={t("servicesTranslations.titleLabel")}
                value={draft[idx]?.title ?? ""}
                description={
                  srv.title
                    ? t("servicesTranslations.esPrefix", { value: srv.title })
                    : undefined
                }
                onValueChange={(v) => patch(idx, "title", v)}
              />
              <FormField
                as="textarea"
                rows={3}
                id={`agency-srv-${active}-${idx}-description`}
                label={t("servicesTranslations.descriptionLabel")}
                value={draft[idx]?.description ?? ""}
                description={
                  srv.description
                    ? t("servicesTranslations.esPrefix", { value: srv.description })
                    : undefined
                }
                onValueChange={(v) => patch(idx, "description", v)}
              />
            </div>
          </div>
        ))}
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
              {t("servicesTranslations.removeLanguage")}
            </Button>
          ) : null}
          <Button
            color="primary"
            startContent={<Save className="size-4" />}
            onPress={onSave}
            isLoading={isSaving}
            isDisabled={isSaving}
          >
            {t("servicesTranslations.saveLocale", { locale: active.toUpperCase() })}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
