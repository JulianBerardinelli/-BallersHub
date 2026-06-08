import { redirect } from "next/navigation";
import { Languages, Lock, Sparkles } from "lucide-react";

import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { playerProfiles } from "@/db/schema/players";
import { subscriptions } from "@/db/schema/subscriptions";
import { eq } from "drizzle-orm";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import {
  getPlayerTranslations,
  type ContentLocale,
  type PlayerLocalizedFields,
} from "@/lib/i18n/profile-content";

import TranslationsEditor, {
  type LocaleFields,
} from "./components/TranslationsEditor";

const ROUTE = "/dashboard/edit-profile/translations";

export const metadata = {
  title: "Idiomas del perfil",
};

function toFields(src: {
  bio: string | null;
  careerObjectives: string | null;
  topCharacteristics: string[] | null;
  tacticsAnalysis: string | null;
  physicalAnalysis: string | null;
  mentalAnalysis: string | null;
  techniqueAnalysis: string | null;
  analysisAuthor: string | null;
}): LocaleFields {
  return {
    bio: src.bio ?? "",
    careerObjectives: src.careerObjectives ?? "",
    topCharacteristics: src.topCharacteristics ?? [],
    tacticsAnalysis: src.tacticsAnalysis ?? "",
    physicalAnalysis: src.physicalAnalysis ?? "",
    mentalAnalysis: src.mentalAnalysis ?? "",
    techniqueAnalysis: src.techniqueAnalysis ?? "",
    analysisAuthor: src.analysisAuthor ?? "",
  };
}

export default async function TranslationsPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/sign-in?redirect=${ROUTE}`);

  const player = await db.query.playerProfiles.findFirst({
    where: eq(playerProfiles.userId, user.id),
  });

  const header = (
    <PageHeader
      title="Idiomas del perfil"
      description="Publicá tu perfil en inglés, italiano y portugués. Cada idioma que completes se vuelve una página propia, indexable y con hreflang — para que scouts de otros mercados te entiendan."
    />
  );

  // Sin perfil de jugador todavía.
  if (!player) {
    return (
      <div className="space-y-6">
        {header}
        <SectionCard
          title="Primero creá tu perfil"
          description="Necesitás un perfil de jugador publicado para poder traducirlo."
        >
          <Link
            href="/dashboard/edit-profile/personal-data"
            className="inline-flex items-center gap-2 rounded-bh-md bg-bh-lime px-4 py-2 text-sm font-semibold text-bh-black transition-colors hover:bg-bh-lime-soft"
          >
            Ir a Datos personales
          </Link>
        </SectionCard>
      </div>
    );
  }

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
    return (
      <div className="space-y-6">
        {header}
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <Lock className="size-4 text-bh-fg-3" />
              Disponible en Pro
            </span>
          }
          description="Con el plan Pro tu perfil llega a scouts de Brasil, Italia y la anglosfera en su propio idioma, sin perder posicionamiento."
        >
          <ul className="mb-5 grid gap-2 text-sm text-bh-fg-2 sm:grid-cols-2">
            {[
              "Hasta 3 idiomas extra (EN · IT · PT)",
              "Una URL indexable por idioma con hreflang",
              "Asistente para autocompletar con IA",
              "Editás y aprobás vos cada versión",
            ].map((b) => (
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
            Ver planes Pro
          </Link>
        </SectionCard>
      </div>
    );
  }

  // Pro → editor.
  const baseEs = toFields(player as unknown as PlayerLocalizedFields);
  const translationsMap = await getPlayerTranslations(player.id);
  const translations: Partial<Record<ContentLocale, LocaleFields>> = {};
  for (const [loc, row] of translationsMap) {
    translations[loc] = toFields(row);
  }
  const available: ContentLocale[] = [
    "es",
    ...(["en", "it", "pt"] as ContentLocale[]).filter((l) => translationsMap.has(l)),
  ];

  return (
    <div className="space-y-6">
      {header}
      <TranslationsEditor
        playerId={player.id}
        baseEs={baseEs}
        translations={translations}
        initialAvailable={available}
      />
    </div>
  );
}
