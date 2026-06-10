"use client";

// Language switcher for PUBLIC portfolios (player / agency). Only offers the
// locales the profile is REALLY translated into (es + rows in *_translations) —
// a locale with no translation would just redirect back to the canonical es.
// Renders nothing when the profile is single-language.
//
// Fixed at the top of the header as a compact dropdown: trigger shows the
// active locale (flag + code, lime), the menu lists the available languages.
// Each option is a next-intl <Link> (navigates to a distinct URL), never a
// client-side state toggle.

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const ORDER: Locale[] = ["es", "en", "it", "pt"];
const META: Record<Locale, { label: string; flag: string }> = {
  es: { label: "Español", flag: "🇦🇷" },
  en: { label: "English", flag: "🇬🇧" },
  it: { label: "Italiano", flag: "🇮🇹" },
  pt: { label: "Português", flag: "🇧🇷" },
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

  return (
    <div className="fixed top-3 right-3 z-[120] md:top-5 md:right-6">
      {/* Click-outside backdrop. */}
      {open ? (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[-1] cursor-default"
        />
      ) : null}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={t("switcher.aria")}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-bh-pill border border-white/10 bg-black/55 px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-colors hover:border-white/25"
        >
          <span className="text-sm leading-none" aria-hidden>
            {cur.flag}
          </span>
          <span>{current}</span>
          <ChevronDown
            className={`size-3.5 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {open ? (
          <div className="absolute right-0 mt-1.5 min-w-[170px] overflow-hidden rounded-bh-md border border-white/10 bg-black/80 p-1 shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            {locales.map((loc) => {
              const isCur = loc === current;
              return (
                <Link
                  key={loc}
                  href={basePath}
                  locale={loc}
                  onClick={() => setOpen(false)}
                  aria-current={isCur ? "true" : undefined}
                  className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-semibold transition-colors ${
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
