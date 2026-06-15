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
      dashboard: (await import(`./messages/${locale}/dashboard.json`)).default,
      dashSettings: (await import(`./messages/${locale}/dashSettings.json`)).default,
      dashEditProfile: (await import(`./messages/${locale}/dashEditProfile.json`)).default,
      dashAgency: (await import(`./messages/${locale}/dashAgency.json`)).default,
      scouting: (await import(`./messages/${locale}/scouting.json`)).default,
      onboarding: (await import(`./messages/${locale}/onboarding.json`)).default,
      checkout: (await import(`./messages/${locale}/checkout.json`)).default,
      mobileNav: (await import(`./messages/${locale}/mobileNav.json`)).default,
      home: (await import(`./messages/${locale}/home.json`)).default,
      site: (await import(`./messages/${locale}/site.json`)).default,
      blog: (await import(`./messages/${locale}/blog.json`)).default,
    },
  };
});
