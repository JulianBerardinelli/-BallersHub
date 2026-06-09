"use client";

// Language switcher for PUBLIC portfolios (player / agency). Unlike the site
// header's LocaleSwitcher, this only offers the locales the profile is REALLY
// translated into (es + rows in *_translations) — switching to a locale with
// no translation would land on a noindex fallback. Renders nothing when the
// profile is single-language.
//
// Per the requirement, each option is a <Link> (navigates to a distinct URL),
// never a client-side state toggle.

import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const ORDER: Locale[] = ["es", "en", "it", "pt"];
const LABEL: Record<Locale, string> = { es: "ES", en: "EN", it: "IT", pt: "PT" };

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
  const locales = ORDER.filter((l) => available.includes(l));
  if (locales.length <= 1) return null;

  return (
    <nav
      aria-label={t("switcher.aria")}
      className="pointer-events-auto fixed bottom-4 right-4 z-[110]"
    >
      <div className="flex items-center gap-0.5 rounded-bh-pill border border-white/10 bg-black/50 px-1.5 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <Globe className="ml-1 mr-0.5 h-3 w-3 shrink-0 text-white/40" aria-hidden />
        {locales.map((loc) => (
          <Link
            key={loc}
            href={basePath}
            locale={loc}
            aria-current={loc === current ? "true" : undefined}
            className={`rounded-bh-pill px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${
              loc === current
                ? "bg-bh-lime text-bh-black"
                : "text-white/60 hover:text-white"
            }`}
          >
            {LABEL[loc]}
          </Link>
        ))}
      </div>
    </nav>
  );
}
