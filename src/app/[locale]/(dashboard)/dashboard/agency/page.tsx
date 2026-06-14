import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  userProfiles,
  agencyMedia,
  agencyCountryProfiles,
  agencyTeamRelations,
  agencyTeamRelationSubmissions,
  agencyTeamRelationProposals,
  teams,
} from "@/db/schema";
import { eq, asc, desc, and, inArray } from "drizzle-orm";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { getTranslations } from "next-intl/server";

import {
  getAgencyTranslations,
  getAgencyMediaTranslationsAllLocales,
  getAgencyCountryProfileTranslationsAllLocales,
} from "@/lib/i18n/profile-content";
import IdentitySection from "./components/IdentitySection";
import GeneralInfoSection from "./components/GeneralInfoSection";
import AgencyTranslationsSection from "./components/AgencyTranslationsSection";
import AgencyServicesTranslationsSection from "./components/AgencyServicesTranslationsSection";
import AgencyMediaTranslationsSection from "./components/AgencyMediaTranslationsSection";
import AgencyCountryProfileTranslationsSection from "./components/AgencyCountryProfileTranslationsSection";
// Below-the-fold sections lazy-load via client wrappers with
// `ssr: false`. Identity + GeneralInfo (first fold) stay sync so the
// initial paint is intact.
import ServicesSection from "./components/lazy/ServicesSectionLazy";
import OperativeReachSection from "./components/lazy/OperativeReachSectionLazy";
import CountriesSection from "./components/lazy/CountriesSectionLazy";
import TeamRelationsSection from "./components/lazy/TeamRelationsSectionLazy";
import ContactSocialSection from "./components/lazy/ContactSocialSectionLazy";
import AgencyMediaManagerClient from "./components/lazy/AgencyMediaManagerClientLazy";

export const metadata = {
  title: "Mi Agencia - Dashboard",
};

export default async function ManagerAgencyPage() {
  const t = await getTranslations("dashAgency");
  const supa = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const up = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
    with: { agency: true },
  });

  if (!up || up.role !== "manager" || !up.agencyId || !up.agency) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("restricted.title")} description={t("restricted.description")} />
        <SectionCard title={t("restricted.cardTitle")} description="">
          <p className="text-bh-fg-3">
            {t("restricted.body")}
          </p>
        </SectionCard>
      </div>
    );
  }

  const { agency } = up;

  // Per-locale translations (description + tagline) for the editor below.
  const agencyTrMap = await getAgencyTranslations(agency.id);
  const agencyTranslations: Partial<
    Record<"en" | "it" | "pt", { description: string | null; tagline: string | null }>
  > = {};
  // Same map, broken out as services-only overrides for the services editor.
  const agencyServicesTranslations: Partial<
    Record<"en" | "it" | "pt", Array<{ title?: string; description?: string | null }>>
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

  // Country narratives
  const countryProfiles = await db.query.agencyCountryProfiles.findMany({
    where: eq(agencyCountryProfiles.agencyId, agency.id),
  });

  // Per-locale overrides for media + country profiles. Defensive: the helpers
  // return empty maps if the translations table isn't migrated yet, so the
  // editor degrades to "es base only" instead of throwing.
  const mediaTrAllLocales = await getAgencyMediaTranslationsAllLocales(
    media.map((m) => m.id),
  );
  const mediaTranslationsForEditor: Record<
    string,
    Partial<Record<"en" | "it" | "pt", { title: string | null; altText: string | null }>>
  > = {};
  for (const [mediaId, perLocale] of mediaTrAllLocales) {
    const entry: Partial<Record<"en" | "it" | "pt", { title: string | null; altText: string | null }>> = {};
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

  // Confirmed team relations + their team rows
  const relations = await db.query.agencyTeamRelations.findMany({
    where: eq(agencyTeamRelations.agencyId, agency.id),
    orderBy: desc(agencyTeamRelations.approvedAt),
  });
  const relationTeamIds = relations.map((r) => r.teamId);
  const relationTeams = relationTeamIds.length
    ? await db.query.teams.findMany({
        where: inArray(teams.id, relationTeamIds),
        columns: {
          id: true,
          name: true,
          country: true,
          countryCode: true,
          crestUrl: true,
          transfermarktUrl: true,
        },
      })
    : [];
  const teamMap = new Map(relationTeams.map((t) => [t.id, t]));
  const relationsWithTeams = relations
    .map((r) => {
      const team = teamMap.get(r.teamId);
      if (!team) return null;
      return {
        id: r.id,
        team: {
          id: team.id,
          name: team.name,
          country: team.country,
          countryCode: team.countryCode,
          crestUrl: team.crestUrl,
          transfermarktUrl: team.transfermarktUrl,
        },
        relationKind: r.relationKind,
        description: r.description,
        approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Pending submissions + their items
  const pendingSubs = await db.query.agencyTeamRelationSubmissions.findMany({
    where: and(
      eq(agencyTeamRelationSubmissions.agencyId, agency.id),
      inArray(agencyTeamRelationSubmissions.status, ["pending", "rejected"]),
    ),
    orderBy: desc(agencyTeamRelationSubmissions.submittedAt),
    limit: 8,
  });
  const submissionIds = pendingSubs.map((s) => s.id);
  const subItems = submissionIds.length
    ? await db.query.agencyTeamRelationProposals.findMany({
        where: inArray(agencyTeamRelationProposals.submissionId, submissionIds),
      })
    : [];
  const subItemTeamIds = subItems.map((i) => i.teamId).filter((id): id is string => !!id);
  const subItemTeams = subItemTeamIds.length
    ? await db.query.teams.findMany({
        where: inArray(teams.id, subItemTeamIds),
        columns: { id: true, name: true, countryCode: true },
      })
    : [];
  const subTeamMap = new Map(subItemTeams.map((t) => [t.id, t]));
  const submissionsForUi = pendingSubs.map((s) => ({
    id: s.id,
    status: s.status,
    note: s.note,
    resolutionNote: s.resolutionNote,
    submittedAt: s.submittedAt.toISOString(),
    reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : null,
    items: subItems
      .filter((it) => it.submissionId === s.id)
      .map((it) => ({
        id: it.id,
        proposedTeamName: it.proposedTeamName,
        proposedTeamCountry: it.proposedTeamCountry,
        proposedTeamCountryCode: it.proposedTeamCountryCode,
        proposedTeamDivision: it.proposedTeamDivision,
        proposedTeamTransfermarktUrl: it.proposedTeamTransfermarktUrl,
        relationKind: it.relationKind,
        description: it.description,
        status: it.status,
        team: it.teamId
          ? subTeamMap.get(it.teamId)
            ? {
                id: it.teamId,
                name: subTeamMap.get(it.teamId)!.name,
                countryCode: subTeamMap.get(it.teamId)!.countryCode,
              }
            : null
          : null,
      })),
  }));

  // Normalize services. Pre-existing rows or partially migrated payloads might
  // arrive as raw strings or partial objects — coerce them into the rich
  // object shape before crossing the server/client boundary.
  const rawServices = (agency.services ?? []) as unknown[];
  const normalizedServices = rawServices.map((s) => {
    if (typeof s === "string") {
      return { title: s, icon: "briefcase", color: null, description: null };
    }
    if (s && typeof s === "object") {
      const obj = s as Record<string, unknown>;
      return {
        title: typeof obj.title === "string" ? obj.title : "",
        icon: typeof obj.icon === "string" && obj.icon ? obj.icon : "briefcase",
        color: typeof obj.color === "string" ? obj.color : null,
        description: typeof obj.description === "string" ? obj.description : null,
      };
    }
    return { title: "", icon: "briefcase", color: null, description: null };
  });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t("page.headerTitle", { name: agency.name })}
        description={t("page.headerDescription")}
      />

      <IdentitySection
        agencyId={agency.id}
        initialLogoUrl={agency.logoUrl}
        initialValues={{
          name: agency.name ?? "",
          slug: agency.slug ?? "",
          tagline: agency.tagline ?? "",
        }}
      />

      <GeneralInfoSection
        agencyId={agency.id}
        agencyName={agency.name}
        initialValues={{
          headquarters: agency.headquarters ?? "",
          foundationYear: agency.foundationYear ? agency.foundationYear.toString() : "",
          description: agency.description ?? "",
        }}
      />

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

      <ServicesSection
        agencyId={agency.id}
        agencyName={agency.name}
        initialServices={normalizedServices}
      />

      <OperativeReachSection
        agencyId={agency.id}
        agencyName={agency.name}
        initialCountries={agency.operativeCountries ?? []}
      />

      <CountriesSection
        agencyName={agency.name}
        operativeCountries={agency.operativeCountries ?? []}
        initialProfiles={countryProfiles.map((p) => ({
          countryCode: p.countryCode,
          description: p.description,
        }))}
      />

      <TeamRelationsSection
        agencyName={agency.name}
        relations={relationsWithTeams}
        pendingSubmissions={submissionsForUi}
      />

      <ContactSocialSection
        agencyId={agency.id}
        agencyName={agency.name}
        initialValues={{
          contactEmail: agency.contactEmail ?? "",
          contactPhone: agency.contactPhone ?? "",
          websiteUrl: agency.websiteUrl ?? "",
          verifiedLink: agency.verifiedLink ?? "",
          instagramUrl: agency.instagramUrl ?? "",
          twitterUrl: agency.twitterUrl ?? "",
          linkedinUrl: agency.linkedinUrl ?? "",
        }}
      />

      <AgencyMediaManagerClient
        agencyId={agency.id}
        media={media.map((m) => ({
          id: m.id,
          url: m.url,
          title: m.title,
          altText: m.altText,
          createdAt: m.createdAt,
        }))}
        agencyContext={{
          name: agency.name,
          headquarters: agency.headquarters,
          operativeCountries: agency.operativeCountries,
        }}
      />
    </div>
  );
}
