import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

// next-intl negotiation (cookie NEXT_LOCALE → Accept-Language → default es),
// with localePrefix 'as-needed'. It skips known crawlers, so bots are never
// locale-redirected. We layer a geo step in FRONT of it (HANDOFF §3).
const intl = createMiddleware(routing);

// Country → locale buckets (ISO 3166-1 alpha-2). Hispanic countries stay on
// the prefix-less default (es). Everything not hispanic/lusophone/italian
// falls through to English — the "otros → en" rule from the plan.
const HISPANIC = new Set([
  "AR", "ES", "MX", "CL", "CO", "UY", "PE", "VE", "EC", "BO",
  "PY", "GT", "CU", "DO", "HN", "NI", "CR", "PA", "SV", "PR",
]);
const LUSOPHONE = new Set(["BR", "PT", "AO", "MZ"]); // → pt (pt-BR)
const ITALIAN = new Set(["IT", "SM", "VA"]); // → it (CH left out: mostly de/fr)

function localeForCountry(country: string): "es" | "en" | "it" | "pt" {
  if (!country) return "es";
  if (HISPANIC.has(country)) return "es";
  if (LUSOPHONE.has(country)) return "pt";
  if (ITALIAN.has(country)) return "it";
  return "en";
}

// Conservative bot matcher — used ONLY to suppress the geo redirect (never
// redirecting a crawler by IP geo avoids any cloaking signal). next-intl has
// its own crawler skip for the negotiation that follows.
const BOT_RE =
  /bot|crawl|spider|slurp|mediapartners|googlebot|bingbot|duckduckbot|baiduspider|yandex|sogou|exabot|facebot|facebookexternalhit|ia_archiver|whatsapp|telegram|embedly|quora|pinterest|redditbot|applebot|petalbot|semrushbot|ahrefsbot/i;

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Geo auto-detect ONLY on the prefix-less home, and only for a visitor with
  // no explicit preference (no NEXT_LOCALE cookie) who isn't a bot. Everything
  // else (deep links, /en, /it, /pt, returning users) is left to next-intl.
  if (pathname === "/") {
    const hasCookie = req.cookies.has("NEXT_LOCALE");
    const ua = req.headers.get("user-agent") ?? "";
    if (!hasCookie && !BOT_RE.test(ua)) {
      const country = (req.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
      const target = localeForCountry(country);
      if (target !== routing.defaultLocale) {
        const url = req.nextUrl.clone();
        url.pathname = `/${target}`;
        // 307: depends on the visitor, never cache as permanent. We do NOT set
        // the cookie here — geo stays the recurring default; only an explicit
        // pick (LocaleSwitcher) pins it via NEXT_LOCALE.
        return NextResponse.redirect(url, 307);
      }
    }
  }

  return intl(req);
}

export const config = {
  // Run on every pathname EXCEPT:
  //  - /api, /trpc            → route handlers stay non-localized
  //  - /_next, /_vercel       → framework internals
  //  - anything containing a dot (files: favicon.ico, sitemap.xml,
  //    robots.txt, llms.txt, og images) → served untouched
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
