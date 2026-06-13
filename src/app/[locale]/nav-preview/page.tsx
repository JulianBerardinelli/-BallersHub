import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { NavPreviewClient } from "./NavPreviewClient";

// Dev-only QA harness for the mobile nav. Lives OUTSIDE the (site) group so it
// doesn't also get the real PublicDockGate dock (which would overlap the
// preview's). 404s in production.
export const metadata: Metadata = {
  title: "Mobile Nav Preview",
  robots: { index: false, follow: false },
};

export default async function NavPreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[760px] bg-bh-black px-6 py-12 text-bh-fg-1">
      <h1 className="font-bh-display text-3xl font-bold uppercase tracking-[-0.01em]">
        Mobile Nav · Preview
      </h1>
      <p className="mt-2 text-sm text-bh-fg-3">
        Floating Dock + drawer — vista de QA (solo desarrollo).
      </p>
      <div className="mt-8">
        <NavPreviewClient />
      </div>
    </main>
  );
}
