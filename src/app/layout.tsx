// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, DM_Mono, DM_Sans, Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { zuume } from "@/lib/fonts";
import "@/styles/globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// BallersHub design system fonts — opt-in via font-display / font-heading / font-dm-sans / font-dm-mono.
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
  metadataBase: resolveMetadataBase(),
  title: { default: "'BallersHub", template: "%s • 'BallersHub" },
  description: "Perfiles profesionales de futbolistas.",
  openGraph: { siteName: "BallersHub", type: "website" },
  twitter: { card: "summary_large_image" },
};

/**
 * Resolve the metadataBase URL defensively. `??` doesn't fall back on
 * empty strings or malformed values (no protocol, trailing whitespace),
 * which used to crash the production build with `TypeError: Invalid URL`
 * when the Vercel env var was misconfigured. We try the env var first;
 * any failure falls through to localhost so the build can complete.
 */
function resolveMetadataBase(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw);
    } catch {
      // Malformed env value (missing protocol, etc.) — fall through.
    }
  }
  return new URL("http://localhost:3000");
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`relative min-h-screen overflow-x-hidden overflow-y-scroll bg-background text-foreground antialiased ${geistSans.variable} ${geistMono.variable} ${zuume.variable} ${barlowCondensed.variable} ${barlow.variable} ${dmSans.variable} ${dmMono.variable}`}>
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 h-full w-full bg-[radial-gradient(125%_125%_at_50%_10%,#001915_40%,#0dd5a5_100%)]"
        />
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
