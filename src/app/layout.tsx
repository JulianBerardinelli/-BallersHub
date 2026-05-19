// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, DM_Mono, DM_Sans, Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "./providers";
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

export const metadata: Metadata = {
  metadataBase: getSiteBaseUrlObject(),
  title: {
    default: "'BallersHub — Perfiles profesionales de futbolistas",
    template: "%s · 'BallersHub",
  },
  description:
    "'BallersHub centraliza el perfil profesional de cada futbolista: trayectoria, estadísticas, galería oficial, videos y contacto. Perfiles verificados de jugadores y agencias.",
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
    locale: "es_AR",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className="dark">
      <body className={`relative min-h-screen overflow-x-hidden overflow-y-scroll bg-background text-foreground antialiased ${geistSans.variable} ${geistMono.variable} ${zuume.variable} ${barlowCondensed.variable} ${barlow.variable} ${dmSans.variable} ${dmMono.variable}`}>
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
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            {children}
          </div>
        </Providers>
        {/*
          Vercel observability — only emit beacons in production so we
          don't pollute the dashboard with dev/preview traffic. Speed
          Insights captures Core Web Vitals (LCP, INP, CLS, FCP, TTFB)
          per route; Analytics captures pageviews + referrers (no
          cookies, GDPR-friendly). Both ship ~2 KB to the client.
        */}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
