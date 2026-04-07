// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { zuume } from "@/lib/fonts";
import "@/styles/globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "'BallersHub", template: "%s • 'BallersHub" },
  description: "Perfiles profesionales de futbolistas.",
  openGraph: { siteName: "BallersHub", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`relative min-h-screen overflow-y-scroll bg-background text-foreground antialiased ${geistSans.variable} ${geistMono.variable} ${zuume.variable}`}>
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 h-full w-full bg-[radial-gradient(125%_125%_at_50%_10%,#001915_40%,#0dd5a5_100%)]"
        />
        <Providers>
          <div className="relative flex min-h-screen flex-col overflow-x-hidden">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
