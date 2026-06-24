"use client";

import { useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { Check, Globe2, Languages, Lock, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import SectionCard from "@/components/dashboard/client/SectionCard";
import FormField from "@/components/dashboard/client/FormField";
import {
  saveAgencyCountryProfileTranslation,
  deleteAgencyCountryProfileTranslation,
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

export type AgencyCountryProfileItem = {
  id: string;
  countryCode: string;
  description: string | null;
};

export type CountryTranslationFields = {
  description: string | null;
};

export default function AgencyCountryProfileTranslationsSection({
  agencyId,
  countryProfiles,
  translations,
}: {
  agencyId: string;
  countryProfiles: AgencyCountryProfileItem[];
  translations: Record<
    string,
    Partial<Record<TargetLocale, CountryTranslationFields>>
  >;
}) {
  const t = useTranslations("dashAgency");

  // Shared cap (see AgencyLocaleCapContext). Country narratives live in their own
  // table but share the agency_profile_translations cap, so they READ the shared
  // state (no writes — a country translation never creates that row).
  const { capReached, maxNonEs, isLocked, firstPublished } = useAgencyLocaleCap();

  const [active, setActive] = useState<TargetLocale>(() => firstPublished ?? "en");

  const [saved, setSaved] = useState<
    Record<string, Partial<Record<TargetLocale, CountryTranslationFields>>>
  >(() => {
    const seed: Record<
      string,
      Partial<Record<TargetLocale, CountryTranslationFields>>
    > = {};
    for (const c of countryProfiles) {
      seed[c.id] = { ...(translations[c.id] ?? {}) };
    }
    return seed;
  });

  function handleSaved(
    countryProfileId: string,
    loc: TargetLocale,
    tr: CountryTranslationFields,
  ) {
    setSaved((prev) => ({
      ...prev,
      [countryProfileId]: { ...(prev[countryProfileId] ?? {}), [loc]: tr },
    }));
  }
  function handleDeleted(countryProfileId: string, loc: TargetLocale) {
    setSaved((prev) => {
      const next = { ...(prev[countryProfileId] ?? {}) };
      delete next[loc];
      return { ...prev, [countryProfileId]: next };
    });
  }

  if (countryProfiles.length === 0) {
    return (
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Languages className="size-4 text-bh-blue" />
            {t("countryTranslations.title")}
          </span>
        }
        description={t("countryTranslations.description")}
      >
        <p className="text-sm text-bh-fg-3">{t("countryTranslations.empty")}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Languages className="size-4 text-bh-blue" />
          {t("countryTranslations.title")}
        </span>
      }
      description={t("countryTranslations.description")}
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
          const anySaved = countryProfiles.some((c) => saved[c.id]?.[l.code]);
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
        {countryProfiles.map((c) => (
          <CountryRow
            key={`${c.id}-${active}`}
            agencyId={agencyId}
            country={c}
            locale={active}
            initial={saved[c.id]?.[active]}
            onSaved={(tr) => handleSaved(c.id, active, tr)}
            onDeleted={() => handleDeleted(c.id, active)}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function CountryRow({
  agencyId,
  country,
  locale,
  initial,
  onSaved,
  onDeleted,
}: {
  agencyId: string;
  country: AgencyCountryProfileItem;
  locale: TargetLocale;
  initial: CountryTranslationFields | undefined;
  onSaved: (tr: CountryTranslationFields) => void;
  onDeleted: () => void;
}) {
  const t = useTranslations("dashAgency");
  const [draft, setDraft] = useState<{ description: string }>({
    description: initial?.description ?? "",
  });
  const [published, setPublished] = useState(!!initial);
  const [feedback, setFeedback] = useState<
    { type: "success" | "danger"; message: string } | null
  >(null);
  const [isSaving, start] = useTransition();

  function onSave() {
    start(async () => {
      const res = await saveAgencyCountryProfileTranslation({
        agencyId,
        countryProfileId: country.id,
        locale,
        fields: { description: draft.description },
      });
      setFeedback({
        type: res.success ? "success" : "danger",
        message: res.success ? t("countryTranslations.successSaved") : res.message,
      });
      if (res.success) {
        setPublished(true);
        onSaved({ description: draft.description.trim() || null });
      }
    });
  }

  function onDelete() {
    start(async () => {
      const res = await deleteAgencyCountryProfileTranslation({
        agencyId,
        countryProfileId: country.id,
        locale,
      });
      setFeedback({
        type: res.success ? "success" : "danger",
        message: res.success ? t("countryTranslations.successDeleted") : res.message,
      });
      if (res.success) {
        setPublished(false);
        setDraft({ description: "" });
        onDeleted();
      }
    });
  }

  return (
    <div className="rounded-bh-md border border-white/[0.08] bg-bh-surface-1 p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-bh-fg-1">
            <Globe2 className="size-3.5 text-bh-fg-3" aria-hidden />
            <span className="font-bh-mono text-[11px] uppercase tracking-[0.14em] text-bh-fg-2">
              {country.countryCode}
            </span>
          </p>
          {country.description ? (
            <p className="mt-1 text-[12px] leading-[1.5] text-bh-fg-4">
              {country.description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {published ? (
            <Chip
              size="sm"
              variant="flat"
              startContent={<Check className="size-3" />}
              className="bg-bh-lime/[0.12] text-bh-lime"
            >
              {t("countryTranslations.chipTranslated")}
            </Chip>
          ) : (
            <Chip size="sm" variant="flat" className="bg-white/[0.06] text-bh-fg-4">
              {t("countryTranslations.chipUntranslated")}
            </Chip>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        <FormField
          as="textarea"
          rows={4}
          id={`agency-country-${country.id}-${locale}-description`}
          label={t("countryTranslations.descriptionLabel")}
          value={draft.description}
          description={
            country.description
              ? t("countryTranslations.esPrefix", { value: country.description })
              : undefined
          }
          onValueChange={(v) => {
            setDraft({ description: v });
            setFeedback(null);
          }}
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
              {t("countryTranslations.remove")}
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
            {t("countryTranslations.saveLocaleShort", {
              locale: locale.toUpperCase(),
            })}
          </Button>
        </div>
      </div>
    </div>
  );
}
