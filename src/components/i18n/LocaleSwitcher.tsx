"use client";

import { useLocale, useTranslations } from "next-intl";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { LOCALE_LABEL } from "@/i18n/config";
import { LocaleFlag } from "./LocaleFlag";

// Short codes shown in the trigger (the full names live in the menu).
const SHORT: Record<Locale, string> = { es: "ES", en: "EN", it: "IT", pt: "PT" };

/**
 * Locale switcher for the site chrome.
 *
 * SEO-correct by construction: selecting a locale performs a real
 * navigation to the SAME route under the new locale (`router.replace`
 * with `{ locale }`), producing a distinct URL — never a client-only
 * state toggle. `usePathname` from `@/i18n/navigation` returns the
 * pathname WITHOUT the locale prefix, so the target resolves to `/...`
 * for es (no prefix) and `/{locale}/...` otherwise. next-intl also
 * persists the choice in the NEXT_LOCALE cookie.
 */
export function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  function onSelect(next: Locale) {
    if (next === locale) return;
    // Preserve query string + hash so switching language never drops
    // filters/search context (e.g. /players?position=GK, /search?q=agent).
    // Read from window in the click handler instead of useSearchParams,
    // which would force dynamic rendering / a Suspense boundary on the
    // header across every page.
    const search = typeof window !== "undefined" ? window.location.search : "";
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    router.replace(`${pathname}${search}${hash}`, { locale: next });
  }

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button
          variant="light"
          size="sm"
          className="min-w-0 gap-1.5 px-2 text-[13px] font-medium text-bh-fg-2 hover:text-bh-lime"
          startContent={<LocaleFlag locale={locale} size={15} />}
          aria-label={t("localeSwitcher.label")}
        >
          {SHORT[locale]}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label={t("localeSwitcher.label")}
        selectionMode="single"
        selectedKeys={new Set([locale])}
        onAction={(key) => onSelect(key as Locale)}
      >
        {routing.locales.map((l) => (
          <DropdownItem key={l} startContent={<LocaleFlag locale={l} size={16} />}>
            {LOCALE_LABEL[l]}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
