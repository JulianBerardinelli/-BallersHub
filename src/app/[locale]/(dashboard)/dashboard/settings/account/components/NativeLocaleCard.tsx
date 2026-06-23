"use client";

import { useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { Check, Languages } from "lucide-react";
import { useTranslations } from "next-intl";

import SectionCard from "@/components/dashboard/client/SectionCard";
import { setPreferredLocale } from "../actions";

// Endonyms (each language in its own name) — intentionally NOT translated.
const LOCALES: { code: string; flag: string; name: string }[] = [
  { code: "es", flag: "🇦🇷", name: "Español" },
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "it", flag: "🇮🇹", name: "Italiano" },
  { code: "pt", flag: "🇧🇷", name: "Português" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
  { code: "fi", flag: "🇫🇮", name: "Suomi" },
];

export default function NativeLocaleCard({ current }: { current: string }) {
  const t = useTranslations("dashboard");
  const [selected, setSelected] = useState(current);
  const [saved, setSaved] = useState(current);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { type: "success" | "danger"; message: string } | null
  >(null);

  function onSave() {
    startTransition(async () => {
      const res = await setPreferredLocale({ locale: selected });
      setFeedback({ type: res.success ? "success" : "danger", message: res.message });
      if (res.success) setSaved(selected);
    });
  }

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Languages className="size-4 text-bh-blue" />
          {t("settings.nativeTitle")}
        </span>
      }
      description={t("settings.nativeDescription")}
    >
      <div className="flex flex-wrap gap-2">
        {LOCALES.map((l) => {
          const active = l.code === selected;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setSelected(l.code);
                setFeedback(null);
              }}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 rounded-bh-md border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                active
                  ? "border-bh-lime/40 bg-bh-lime/[0.08] text-bh-fg-1"
                  : "border-white/[0.08] bg-bh-surface-1 text-bh-fg-3 hover:border-white/[0.18]"
              }`}
            >
              <span aria-hidden>{l.flag}</span>
              {l.name}
              {l.code === saved ? (
                <Check className="size-3.5 text-bh-lime" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-[1.5] text-bh-fg-4">
        {t("settings.nativeHint")}
      </p>

      {(selected !== saved || feedback) && (
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
          {selected !== saved ? (
            <Button
              color="primary"
              size="sm"
              onPress={onSave}
              isLoading={isPending}
              isDisabled={isPending}
            >
              {t("settings.nativeSave")}
            </Button>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}
