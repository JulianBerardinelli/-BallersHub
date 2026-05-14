// Resolve the public canonical base URL used across SEO surfaces
// (sitemap.xml, robots.txt, OG image absolute URLs, JSON-LD `@id`/`url`,
// `alternates.canonical`).
//
// Single source of truth. Mirrors the priority order in
// `src/lib/billing/env.ts#appUrl` so checkout and SEO never disagree
// about which host the deploy is serving from:
//
//   1. NEXT_PUBLIC_APP_URL  — explicit canonical setting (preferred)
//   2. NEXT_PUBLIC_SITE_URL — legacy alias
//   3. VERCEL_URL           — auto-injected by Vercel (host only, no protocol)
//   4. localhost            — last-resort fallback for `npm run dev`
//
// Any malformed value (missing protocol, trailing slashes, whitespace) is
// normalized before being returned, so callers can rely on a clean
// `https://host` string with NO trailing slash.

function pickRaw(): string | undefined {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL,
  ];
  return candidates.find((v) => typeof v === "string" && v.trim().length > 0);
}

function normalize(input: string): string {
  let v = input.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(v)) {
    // VERCEL_URL ships as host only — assume HTTPS.
    v = `https://${v}`;
  }
  return v;
}

/**
 * Canonical site base URL (no trailing slash).
 *
 * Examples: `https://ballershub.co`, `https://ballershub-git-dev.vercel.app`,
 * `http://localhost:3000`.
 */
export function getSiteBaseUrl(): string {
  const raw = pickRaw();
  return raw ? normalize(raw) : "http://localhost:3000";
}

/**
 * Same as `getSiteBaseUrl` but returns a `URL` object. Convenient for
 * `metadata.metadataBase` and anywhere a real `URL` is expected.
 */
export function getSiteBaseUrlObject(): URL {
  return new URL(getSiteBaseUrl());
}

/**
 * Build a canonical absolute URL for a path that may be absolute or
 * relative. Pass paths like `"/julian-berardinelli"` and you'll get
 * `"https://ballershub.co/julian-berardinelli"` back. Idempotent for
 * already-absolute inputs.
 */
export function toCanonicalUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = getSiteBaseUrl();
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}
