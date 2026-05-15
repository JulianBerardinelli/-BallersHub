// robots.txt — generated dynamically so the absolute sitemap URL stays
// in sync with whichever environment (prod, Vercel preview, local) is
// serving the response. Next.js maps this file route to /robots.txt
// automatically.
//
// Policy:
//   • Allow everything by default — public portfolios MUST be crawlable.
//   • Disallow dashboard, admin, checkout, onboarding, auth, api, and
//     unsubscribe endpoints. These are either authenticated, private,
//     or transactional (and already carry `robots: noindex` per-page).
//   • Allow `/agency/<slug>` and `/<slug>` (player) explicitly via the
//     default Allow.
//   • Block `?force_free=1` and similar dev query strings via clean
//     canonical URLs (handled by `alternates.canonical` in metadata).
//
// We do NOT block staging/preview environments here — instead, on those
// hosts we want crawlers to see the same file but we'd rely on Vercel's
// `x-robots-tag: noindex` (set globally for preview deploys via
// `vercel.json` headers when we add that later). This keeps the source
// of truth in one place.

import type { MetadataRoute } from "next";
import { getSiteBaseUrl } from "@/lib/seo/baseUrl";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/admin/",
          "/checkout/",
          "/onboarding/",
          "/auth/",
          "/api/",
          "/unsubscribe",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
