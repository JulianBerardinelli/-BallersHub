// app/(site)/legal/privacy/page.tsx — Política de Privacidad.
// Content lives in the `legal` i18n namespace; rendered by <LegalDocument />.
import type { Metadata } from "next";
import { ogFallbackImages } from "@/lib/og/fallback";
import { getTranslations } from "next-intl/server";

import LegalDocument from "@/components/site/legal/LegalDocument";
import { localizedAlternates } from "@/lib/seo/hreflang";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  const title = t("privacy.metaTitle");
  const description = t("privacy.metaDescription");
  const ogTitle = t("privacy.ogTitle");
  return {
    title,
    description,
    alternates: localizedAlternates(locale as Locale, "/legal/privacy"),
    openGraph: { title: ogTitle, description, url: "/legal/privacy", type: "website", images: ogFallbackImages },
    twitter: { card: "summary_large_image", title: ogTitle, description },
  };
}

export default function PrivacyPage() {
  return <LegalDocument doc="privacy" />;
}
