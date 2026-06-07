import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale negotiation, runs before every (non-excluded) page request:
//  - resolves locale from the NEXT_LOCALE cookie → Accept-Language →
//    defaultLocale (es).
//  - with localePrefix 'as-needed' it rewrites the prefix-less default
//    ('/', '/dashboard', '/[slug]') to the [locale] segment INTERNALLY
//    (the visible URL stays prefix-less for es), and serves /en, /it, /pt
//    for the other locales.
//  - next-intl skips known crawlers (Googlebot/Bingbot), so bots are
//    NEVER redirected by locale → no cloaking risk. Verified in 0e.
export default createMiddleware(routing);

export const config = {
  // Run on every pathname EXCEPT:
  //  - /api, /trpc            → route handlers stay non-localized
  //  - /_next, /_vercel       → framework internals
  //  - anything containing a dot (files: favicon.ico, sitemap.xml,
  //    robots.txt, llms.txt, og images) → served untouched
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
