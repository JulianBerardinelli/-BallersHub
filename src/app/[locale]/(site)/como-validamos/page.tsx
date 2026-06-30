// app/(site)/como-validamos/page.tsx
// Página /como-validamos — el workflow de validación (scrolljacking estilo n8n).
// Hereda header, ambient y footer del SiteLayout; rompe el contenedor de 1200px
// para ser full-bleed (el stage interno es position: sticky).

import type { Metadata } from "next";
import { ogFallbackImages } from "@/lib/og/fallback";
import { getTranslations } from "next-intl/server";

import ValidationFlow from "@/components/site/como-validamos/ValidationFlow";
import { localizedAlternates } from "@/lib/seo/hreflang";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site.comoValidamos" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  const ogTitle = t("ogTitle");
  return {
    title,
    description,
    alternates: localizedAlternates(locale as Locale, "/como-validamos"),
    openGraph: {
      title: ogTitle,
      description,
      url: "/como-validamos",
      type: "website",
      images: ogFallbackImages,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default function ComoValidamosPage() {
  // Full-bleed breakout from the 1200px <main> via negative margin (NOT a
  // transform — keeps the inner `position: sticky` working). `-mt-[6.5rem]`
  // cancels the layout's top padding so the hero starts at the very top, behind
  // the transparent fixed header (which goes solid on scroll).
  return (
    <div className="relative ml-[calc(50%-50vw)] w-screen -mt-[6.5rem]">
      <ValidationFlow />
    </div>
  );
}
