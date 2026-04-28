// src/app/(onboarding)/layout.tsx
import Link from "next/link";

import { Wordmark } from "@/components/brand/Wordmark";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate min-h-screen bg-bh-black">
      {/* Ambient lime + blue */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute -left-24 -top-32 h-[600px] w-[600px] rounded-full blur-[80px]"
          style={{
            background:
              "radial-gradient(circle, rgba(204,255,0,0.08) 0%, transparent 70%)",
            animation: "bh-orb-1 18s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-12 right-[5%] h-[500px] w-[500px] rounded-full blur-[80px]"
          style={{
            background:
              "radial-gradient(circle, rgba(0,194,255,0.08) 0%, transparent 70%)",
            animation: "bh-orb-2 22s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse 90% 90% at 50% 50%, black 30%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 90% 90% at 50% 50%, black 30%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative z-10">
        <header className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-6">
          <Link href="/" aria-label="'BallersHub" className="flex items-center">
            <Wordmark size="nav" />
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
