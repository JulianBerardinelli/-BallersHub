// /staff — directorio público del Cuerpo Técnico (job board) + hub SEO.
//
// Dos capas en un RSC (mismo patrón que /players y /agencies):
//   1. SEO: JSON-LD CollectionPage + ItemList (subset indexable = el del
//      sitemap, sin drift) + grid de <Link href="/staff/<slug>"> reales
//      (superficie de internal-linking contra "Discovered – not indexed").
//   2. Directorio: lista TODOS los perfiles approved+public (Free incluido),
//      con filtros server-rendered por rol / nacionalidad / idioma.
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ogFallbackImages } from "@/lib/og/fallback";
import { localizedAlternates } from "@/lib/seo/hreflang";
import { OG_LOCALE } from "@/i18n/config";
import type { Locale } from "@/i18n/routing";
import { DirectoryJsonLd, type DirectoryItem } from "@/lib/seo/directoryJsonLd";
import { getIndexableCoaches } from "@/lib/seo/indexable-profiles";
import {
  loadStaffDirectory,
  computeStaffFacets,
  filterStaffDirectory,
} from "@/lib/staff/directory";
import StaffCard from "@/components/site/staff/StaffCard";
import StaffFilters from "@/components/site/staff/StaffFilters";

// Hourly ISR — misma cadencia que el sitemap y las páginas de perfil. Un perfil
// aprobado/editado aparece dentro de la hora vía revalidateCoachPublicProfile.
export const revalidate = 3600;

const PAGE_PATH = "/staff";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("staff.directory");
  const alt = localizedAlternates(locale as Locale, PAGE_PATH);
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alt,
    openGraph: {
      title: t("ogTitle"),
      description: t("metaDescription"),
      url: alt.canonical,
      type: "website",
      images: ogFallbackImages,
      siteName: "'BallersHub",
      locale: OG_LOCALE[locale as Locale] ?? "es_AR",
    },
  };
}

export default async function StaffDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const t = await getTranslations("staff.directory");

  const single = (v: string | string[] | undefined): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const active = {
    role: single(sp.role),
    nationality: single(sp.nationality),
    language: single(sp.language),
  };

  // Dataset completo (degrada a vacío ante un hipo de DB, nunca 500).
  let all: Awaited<ReturnType<typeof loadStaffDirectory>> = [];
  try {
    all = await loadStaffDirectory();
  } catch (err) {
    console.error("[/staff] failed to load directory:", err);
  }
  const facets = computeStaffFacets(all);
  const filtered = filterStaffDirectory(all, active);

  // JSON-LD ItemList sobre el subset INDEXABLE (matchea el sitemap; un Free de
  // bio fina se linkea en el grid pero no se anuncia como structured data).
  let jsonLdItems: DirectoryItem[] = [];
  try {
    const indexable = await getIndexableCoaches();
    jsonLdItems = indexable.map((c) => ({ url: `/staff/${c.slug}`, name: c.fullName }));
  } catch {
    jsonLdItems = [];
  }

  return (
    <>
      <DirectoryJsonLd
        path={PAGE_PATH}
        name={t("collectionName")}
        description={t("metaDescription")}
        items={jsonLdItems}
      />

      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-6 md:py-14">
        {/* Hero */}
        <header className="mb-8 space-y-2">
          <p className="font-bh-display text-[11px] font-bold uppercase tracking-[0.16em] text-bh-lime">
            {t("heroEyebrow")}
          </p>
          <h1 className="font-bh-display text-4xl font-black uppercase leading-[0.95] tracking-[-0.01em] text-bh-fg-1 md:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="max-w-[640px] text-sm leading-[1.6] text-bh-fg-3 md:text-base">
            {t("heroSubtitle")}
          </p>
        </header>

        {/* Filtros + contador */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <StaffFilters facets={facets} active={active} />
          <span className="font-bh-mono text-[12px] text-bh-fg-4">
            {t("results", { count: filtered.length })}
          </span>
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {filtered.map((item) => (
              <li key={item.slug}>
                <StaffCard item={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-8 text-center text-sm text-bh-fg-3">
            {t("empty")}
          </p>
        )}
      </div>
    </>
  );
}
