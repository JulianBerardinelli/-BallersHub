import { eq, asc } from "drizzle-orm";
import { Languages, Lock, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { db } from "@/lib/db";
import { agencyMedia, agencyCountryProfiles, subscriptions } from "@/db/schema";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { Link } from "@/i18n/navigation";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import {
  getAgencyTranslations,
  getAgencyMediaTranslationsAllLocales,
  getAgencyCountryProfileTranslationsAllLocales,
} from "@/lib/i18n/profile-content";
import { requireManagerAgency } from "../_lib/require-manager-agency";
import AgencyRestricted from "../_lib/AgencyRestricted";
import { normalizeAgencyServices } from "../_lib/normalize-services";
import AgencyTranslationsSection from "../components/AgencyTranslationsSection";
import AgencyServicesTranslationsSection from "../components/AgencyServicesTranslationsSection";
import AgencyMediaTranslationsSection from "../components/AgencyMediaTranslationsSection";
import AgencyCountryProfileTranslationsSection from "../components/AgencyCountryProfileTranslationsSection";

export async function generateMetadata() {
  const t = await getTranslations("dashAgency");
  return { title: t("translationsPage.metaTitle") };
}

// Idiomas de la agencia (Pro). La base `es` se edita en cada página de feature
// (Datos principales / Servicios / Alcance / Multimedia); acá sólo se cargan
// los overrides en/it/pt. Mismo patrón que el perfil de jugador.
export default async function AgencyTranslationsPage() {
  const ctx = await requireManagerAgency();
  if (!ctx) return <AgencyRestricted />;
  const { user, agency } = ctx;
  const t = await getTranslations("dashAgency");

  const header = (
    <PageHeader
      title={t("translationsPage.pageTitle")}
      description={t("translationsPage.pageDescription")}
    />
  );

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, user.id),
    columns: {
      plan: true,
      planId: true,
      status: true,
      statusV2: true,
      processor: true,
      processorSubscriptionId: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  const planAccess = resolvePlanAccess(
    sub
      ? {
          plan: sub.plan,
          planId: sub.planId,
          status: sub.status,
          statusV2: sub.statusV2,
          processor: sub.processor,
          processorSubscriptionId: sub.processorSubscriptionId,
          currentPeriodEnd: sub.currentPeriodEnd
            ? sub.currentPeriodEnd.toISOString()
            : null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
          trialEndsAt: null,
          canceledAt: null,
        }
      : null,
  );

  // Free → upsell (las traducciones son Pro).
  if (!planAccess.isPro) {
    const bullets = [
      t("translationsPage.upsell.b1"),
      t("translationsPage.upsell.b2"),
      t("translationsPage.upsell.b3"),
      t("translationsPage.upsell.b4"),
    ];
    return (
      <div className="space-y-6">
        {header}
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <Lock className="size-4 text-bh-fg-3" />
              {t("translationsPage.upsell.title")}
            </span>
          }
          description={t("translationsPage.upsell.description")}
        >
          <ul className="mb-5 grid gap-2 text-sm text-bh-fg-2 sm:grid-cols-2">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-bh-lime" />
                {b}
              </li>
            ))}
          </ul>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-bh-md bg-bh-lime px-5 py-2.5 text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all hover:-translate-y-px hover:bg-bh-lime-soft"
          >
            <Languages className="size-4" />
            {t("translationsPage.upsell.cta")}
          </Link>
        </SectionCard>
      </div>
    );
  }

  // Pro → los 4 editores de traducción (description+tagline, servicios, media,
  // narrativas por país). Helpers degradan a "es base only" si la tabla de
  // traducciones no está migrada.
  const agencyTrMap = await getAgencyTranslations(agency.id);
  const agencyTranslations: Partial<
    Record<"en" | "it" | "pt" | "de" | "fr" | "fi", { description: string | null; tagline: string | null }>
  > = {};
  const agencyServicesTranslations: Partial<
    Record<"en" | "it" | "pt" | "de" | "fr" | "fi", Array<{ title?: string; description?: string | null }>>
  > = {};
  for (const [loc, row] of agencyTrMap) {
    if (loc === "es") continue;
    agencyTranslations[loc] = { description: row.description, tagline: row.tagline };
    if (row.services) agencyServicesTranslations[loc] = row.services;
  }

  const media = await db.query.agencyMedia.findMany({
    where: eq(agencyMedia.agencyId, agency.id),
    orderBy: asc(agencyMedia.position),
  });
  const countryProfiles = await db.query.agencyCountryProfiles.findMany({
    where: eq(agencyCountryProfiles.agencyId, agency.id),
  });

  const mediaTrAllLocales = await getAgencyMediaTranslationsAllLocales(
    media.map((m) => m.id),
  );
  const mediaTranslationsForEditor: Record<
    string,
    Partial<Record<"en" | "it" | "pt", { title: string | null; altText: string | null }>>
  > = {};
  for (const [mediaId, perLocale] of mediaTrAllLocales) {
    const entry: Partial<
      Record<"en" | "it" | "pt", { title: string | null; altText: string | null }>
    > = {};
    for (const loc of ["en", "it", "pt"] as const) {
      const tr = perLocale[loc];
      if (tr) entry[loc] = { title: tr.title, altText: tr.altText };
    }
    mediaTranslationsForEditor[mediaId] = entry;
  }

  const countryTrAllLocales = await getAgencyCountryProfileTranslationsAllLocales(
    countryProfiles.map((c) => c.id),
  );
  const countryTranslationsForEditor: Record<
    string,
    Partial<Record<"en" | "it" | "pt", { description: string | null }>>
  > = {};
  for (const [countryId, perLocale] of countryTrAllLocales) {
    const entry: Partial<Record<"en" | "it" | "pt", { description: string | null }>> = {};
    for (const loc of ["en", "it", "pt"] as const) {
      const tr = perLocale[loc];
      if (tr) entry[loc] = { description: tr.description };
    }
    countryTranslationsForEditor[countryId] = entry;
  }

  const normalizedServices = normalizeAgencyServices((agency.services ?? []) as unknown[]);

  return (
    <div className="space-y-6">
      {header}

      <AgencyTranslationsSection
        agencyId={agency.id}
        base={{
          description: agency.description ?? "",
          tagline: agency.tagline ?? "",
        }}
        translations={agencyTranslations}
      />

      <AgencyServicesTranslationsSection
        agencyId={agency.id}
        services={normalizedServices.map((s) => ({
          title: s.title,
          description: s.description,
        }))}
        translations={agencyServicesTranslations}
      />

      <AgencyMediaTranslationsSection
        agencyId={agency.id}
        mediaItems={media.map((m) => ({
          id: m.id,
          url: m.url,
          title: m.title,
          altText: m.altText,
        }))}
        translations={mediaTranslationsForEditor}
      />

      <AgencyCountryProfileTranslationsSection
        agencyId={agency.id}
        countryProfiles={countryProfiles.map((c) => ({
          id: c.id,
          countryCode: c.countryCode,
          description: c.description,
        }))}
        translations={countryTranslationsForEditor}
      />
    </div>
  );
}
