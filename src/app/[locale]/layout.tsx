// app/[locale]/layout.tsx — root layout. With next-intl + the [locale]
// segment THIS file owns <html>/<body>; there is no app/layout.tsx.
import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, DM_Mono, DM_Sans, Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Providers } from "@/app/providers";
import { routing } from "@/i18n/routing";
import { HTML_LANG, OG_LOCALE } from "@/i18n/config";
import { zuume } from "@/lib/fonts";
import { getSiteBaseUrlObject } from "@/lib/seo/baseUrl";
import { OrganizationJsonLd } from "@/lib/seo/organizationJsonLd";
import "@/styles/globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// 'BallersHub design system fonts — opt-in via font-display / font-heading / font-dm-sans / font-dm-mono.
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  display: "swap",
});
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("site");
  // og:locale per page locale (config.ts is the single source of truth).
  // Falls back to es_AR for any unknown segment (the route 404s anyway).
  const ogLocale =
    (hasLocale(routing.locales, locale) && OG_LOCALE[locale]) || "es_AR";
  return {
    metadataBase: getSiteBaseUrlObject(),
    title: {
      default: t("meta.homeTitle"),
      template: "%s · 'BallersHub",
    },
    description: t("meta.homeDescription"),
    applicationName: "'BallersHub",
    keywords: [
      "futbolistas",
      "perfil de jugador",
      "scouting",
      "agencias de representación",
      "portfolio de futbolista",
      // Brand: real form has the leading apostrophe. We also ship the
      // unapostrophed and space-separated variants so queries like
      // "ballershub" or "ballers hub" (the natural way someone types it
      // when they don't remember the punctuation) still match. The
      // domain ballershub.co reinforces the unapostrophed match.
      "'BallersHub",
      "BallersHub",
      "Ballers Hub",
    ],
    authors: [{ name: "'BallersHub" }],
    creator: "'BallersHub",
    publisher: "'BallersHub",
    openGraph: {
      siteName: "'BallersHub",
      type: "website",
      locale: ogLocale,
    },
    twitter: { card: "summary_large_image", site: "@ballershub_" },
    // Default robots policy — public-by-default. Pages that must not be
    // indexed (checkout, dashboard, admin) override this in their own
    // `generateMetadata` with `robots: { index: false, follow: false }`.
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  // App-wide zoom + overscroll behaviour:
  // - `width: device-width` + `initialScale: 1` keep the layout at the
  //   intended viewport size on every device.
  // - `maximumScale: 1` + `userScalable: false` disable pinch-to-zoom.
  //   The css `overscroll-behavior` + `touch-action` rules in
  //   `globals.css` back this up (Safari iOS sometimes ignores the meta
  //   tag alone) and also block the rubber-band overscroll that exposed
  //   the body background underneath the app.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Pre-render the four locales at build time (works with setRequestLocale
// below to keep these pages statically rendered).
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // 404 on unknown locales (e.g. /xx/...) instead of rendering a broken
  // default — keeps the [locale] segment strict.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // Opt into static rendering for this locale.
  setRequestLocale(locale);

  // GA4 tag (organic→Pro funnel, docs/seo/iter-2-ga4-integration-spec.md).
  // Loads ONLY on the production deployment (VERCEL_ENV) so preview/dev
  // traffic never pollutes the property — safe even when NEXT_PUBLIC_GA_ID is
  // present in every environment. Unlike Vercel Analytics (cookieless), GA4
  // sets cookies.
  const gaId =
    process.env.VERCEL_ENV === "production"
      ? process.env.NEXT_PUBLIC_GA_ID
      : undefined;

  return (
    <html lang={HTML_LANG[locale]} className="dark">
      <body className={`relative min-h-screen overflow-x-clip bg-background text-foreground antialiased ${geistSans.variable} ${geistMono.variable} ${zuume.variable} ${barlowCondensed.variable} ${barlow.variable} ${dmSans.variable} ${dmMono.variable}`}>
        {/*
          Sitewide structured data: Organization + WebSite (with
          SearchAction). Rendered server-side so crawlers receive it
          on the first byte. See `src/lib/seo/organizationJsonLd.tsx`.
        */}
        <OrganizationJsonLd />

        {/*
          Deepest layer behind the entire app. Was previously a teal
          radial that bled green at the edges on overscroll — replaced
          with a pure dark radial so the app's background reads as one
          consistent dark tone, even when the user pulls past the body
          on mobile.
        */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 h-full w-full bg-[radial-gradient(125%_125%_at_50%_10%,#0a0a0a_40%,#000000_100%)]"
        />
        <NextIntlClientProvider>
          <Providers>
            <div className="relative flex min-h-screen flex-col">
              {children}
            </div>
          </Providers>
        </NextIntlClientProvider>
        {/*
          Vercel observability — only emit beacons in production so we
          don't pollute the dashboard with dev/preview traffic. Speed
          Insights captures Core Web Vitals (LCP, INP, CLS, FCP, TTFB)
          per route; Analytics captures pageviews + referrers (no
          cookies, GDPR-friendly). Both ship ~2 KB to the client.
        */}
        <SpeedInsights />
        <Analytics />
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  );
}
