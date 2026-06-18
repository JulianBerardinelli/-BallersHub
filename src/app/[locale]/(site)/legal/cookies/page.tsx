// app/(site)/legal/cookies/page.tsx — Política de Cookies.
// Content lives in the `legal` i18n namespace; rendered by <LegalDocument />.
import type { Metadata } from "next";
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
  const title = t("cookies.metaTitle");
  const description = t("cookies.metaDescription");
  const ogTitle = t("cookies.ogTitle");
  return {
    title,
    description,
    alternates: localizedAlternates(locale as Locale, "/legal/cookies"),
    openGraph: { title: ogTitle, description, url: "/legal/cookies", type: "website" },
    twitter: { card: "summary_large_image", title: ogTitle, description },
  };
}

export default function CookiesPage() {
  return <LegalDocument doc="cookies" />;
}
