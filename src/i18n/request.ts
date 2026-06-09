import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

// Server-side message resolution, run once per request by next-intl.
//
// Messages are namespaced by file (common, home, pricing, dashboard, ...)
// and merged under one object, so components read them via
// useTranslations('common') / getTranslations('common'). Add a new
// namespace here as each phase introduces its JSON files — keep the keys
// in sync across es/en/it/pt (Phase 7 CI lint enforces parity).
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: {
      common: (await import(`./messages/${locale}/common.json`)).default,
      footer: (await import(`./messages/${locale}/footer.json`)).default,
      auth: (await import(`./messages/${locale}/auth.json`)).default,
      about: (await import(`./messages/${locale}/about.json`)).default,
      pricing: (await import(`./messages/${locale}/pricing.json`)).default,
      teamPicker: (await import(`./messages/${locale}/teamPicker.json`)).default,
      portfolio: (await import(`./messages/${locale}/portfolio.json`)).default,
    },
  };
});
