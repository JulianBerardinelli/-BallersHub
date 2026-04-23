// src/app/(auth)/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: { default: "Acceder", template: "%s • BallersHub" },
  description: "Accedé a tu cuenta BallersHub",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#050505] overflow-hidden selection:bg-white/20">
      {/* Subtle Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Back to Home */}
      <Link 
        href="/" 
        className="absolute top-8 left-8 flex items-center gap-2 text-sm text-neutral-500 hover:text-white transition-colors z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </Link>

      <main className="w-full max-w-[420px] p-8 mx-4 bg-neutral-950/60 backdrop-blur-2xl rounded-[32px] border border-white/10 shadow-2xl shadow-black z-10">
        <div className="flex justify-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-lg leading-none">B</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">BallersHub</h1>
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
