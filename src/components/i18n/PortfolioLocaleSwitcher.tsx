"use client";

// Language switcher for PUBLIC portfolios (player / agency). Only offers the
// locales the profile is REALLY translated into (es + rows in *_translations);
// a locale with no translation just redirects back to the canonical es. Renders
// nothing when the profile is single-language.
//
// Styled to match the portfolio header pill (same glass bubble: bg, border,
// radius, shadow) and pinned at the header's height on the right. On mobile the
// header's nav pill is centered and nearly full-width, so the switcher drops
// just below it instead of overlapping. Each option is a next-intl <Link>.

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const ORDER: Locale[] = ["es", "en", "it", "pt", "de", "fr", "fi"];
const META: Record<Locale, { label: string; flag: string }> = {
  es: { label: "Español", flag: "🇦🇷" },
  en: { label: "English", flag: "🇬🇧" },
  it: { label: "Italiano", flag: "🇮🇹" },
  pt: { label: "Português", flag: "🇧🇷" },
  de: { label: "Deutsch", flag: "🇩🇪" },
  fr: { label: "Français", flag: "🇫🇷" },
  fi: { label: "Suomi", flag: "🇫🇮" },
};

export default function PortfolioLocaleSwitcher({
  basePath,
  available,
  current,
}: {
  /** Locale-less canonical path, e.g. `/messi` or `/agency/norte`. */
  basePath: string;
  available: string[];
  current: string;
}) {
  const t = useTranslations("portfolio");
  const [open, setOpen] = useState(false);
  const locales = ORDER.filter((l) => available.includes(l));
  if (locales.length <= 1) return null;

  const cur = META[current as Locale] ?? META.es;

  // Same glass bubble as the header nav pill.
  const pill =
    "bg-black/40 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.5)]";

  return (
    <div className="pointer-events-none fixed right-3 top-[4.75rem] z-[101] md:right-5 md:top-6 lg:right-8">
      {/* Click-outside backdrop. */}
      {open ? (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="pointer-events-auto fixed inset-0 z-[-1] cursor-default"
        />
      ) : null}

      <div className="relative flex flex-col items-end">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={t("switcher.aria")}
          aria-expanded={open}
          className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2.5 text-white transition-colors hover:border-white/20 ${pill}`}
        >
          <span className="text-sm leading-none" aria-hidden>
            {cur.flag}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
            {current}
          </span>
          <ChevronDown
            className={`size-3.5 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {open ? (
          <div
            className={`pointer-events-auto mt-2 min-w-[168px] overflow-hidden p-1 ${pill}`}
          >
            {locales.map((loc) => {
              const isCur = loc === current;
              return (
                <Link
                  key={loc}
                  href={basePath}
                  locale={loc}
                  onClick={() => setOpen(false)}
                  aria-current={isCur ? "true" : undefined}
                  className={`flex items-center gap-2.5 rounded-full px-3 py-2 text-[13px] font-semibold transition-colors ${
                    isCur
                      ? "bg-bh-lime text-bh-black"
                      : "text-white/75 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  <span className="text-base leading-none" aria-hidden>
                    {META[loc].flag}
                  </span>
                  <span>{META[loc].label}</span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
