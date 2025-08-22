// app/(auth)/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Acceder", template: "%s • BallersHub" },
  description: "Accedé a tu cuenta BallersHub",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-black">
      <div className="w-full max-w-md p-6 bg-neutral-950 rounded-2xl border border-neutral-800">
        <h1 className="text-xl font-semibold text-center mb-4">'BallersHub</h1>
        {children}
      </div>
    </div>
  );
}
