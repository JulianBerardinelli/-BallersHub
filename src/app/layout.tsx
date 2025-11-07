// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
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
  // 👇 NO comentarios ni JSX suelto dentro de <html>
  return (
    <html lang="es" className="dark">
      <body className={`dark bg-background text-foreground ${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          <div className="relative min-h-screen overflow-x-hidden">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 h-full w-full px-5 py-24 [background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#2dd4bf_100%)]"
            />
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
