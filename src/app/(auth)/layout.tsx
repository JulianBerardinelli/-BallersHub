// src/app/(auth)/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Wordmark } from "@/components/brand/Wordmark";

export const metadata: Metadata = {
  title: { default: "Acceder", template: "%s • 'BallersHub" },
  description: "Accedé a tu cuenta 'BallersHub",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bh-black selection:bg-bh-lime selection:text-bh-black">
      {/* Ambient orbs — lime + blue */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[10%] -top-[20%] h-[50vw] w-[50vw] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(204,255,0,0.10) 0%, transparent 70%)",
          animation: "bh-orb-1 16s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[20%] -right-[10%] h-[50vw] w-[50vw] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(0,194,255,0.10) 0%, transparent 70%)",
          animation: "bh-orb-2 20s ease-in-out infinite",
        }}
      />
      {/* Mesh grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
        }}
      />

      {/* Back to home */}
      <Link
        href="/"
        className="absolute left-8 top-8 z-10 flex items-center gap-2 text-sm text-bh-fg-3 transition-colors hover:text-bh-fg-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>

      <main className="relative z-10 mx-4 w-full max-w-[420px] rounded-bh-xl border border-white/10 bg-bh-surface-1/70 p-8 shadow-2xl shadow-black/60 backdrop-blur-2xl">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="inline-flex items-center">
            <Wordmark size="nav" />
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
