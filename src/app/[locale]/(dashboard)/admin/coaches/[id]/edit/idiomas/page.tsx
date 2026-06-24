import { redirect, notFound } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveProUserIds } from "@/lib/seo/indexable-profiles";
import CoachTranslationsEditor, {
  type CoachLocaleFields,
  type CoachTranslatableLocale,
} from "@/app/[locale]/(dashboard)/dashboard/coach/translations/CoachTranslationsEditor";
import {
  adminSaveCoachTranslation,
  adminDeleteCoachTranslation,
} from "@/app/actions/admin-coach";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar idiomas - Ballers Hub" };

const LOCALES: CoachTranslatableLocale[] = ["en", "it", "pt", "de", "fr", "fi"];

export default async function AdminCoachTranslationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/sign-in?redirect=/admin/coaches/${id}/edit/idiomas`);
  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  const admin = createSupabaseAdmin();
  const { data: coach } = await admin
    .from("coach_profiles")
    .select(
      "id, user_id, full_name, bio, career_objectives, playing_style, methodology_analysis, analysis_author",
    )
    .eq("id", id)
    .maybeSingle();
  if (!coach) notFound();

  // Translations are a Pro feature — gate the editor by the TARGET coach's plan,
  // mirroring how the player admin gates Pro sections (grant a comp account to
  // edit a Free coach's translations).
  const proIds = await resolveProUserIds([coach.user_id as string]);
  const isPro = proIds.has(coach.user_id as string);
  if (!isPro) {
    return (
      <div className="space-y-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6">
        <h2 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Idiomas · disponible en Pro
        </h2>
        <p className="text-sm text-bh-fg-3">
          Las traducciones (inglés, italiano, portugués) son parte del plan Pro. Este DT es Free —
          otorgale una cuenta de cortesía en{" "}
          <span className="font-bh-mono text-bh-fg-2">/admin/comp-accounts</span> para habilitarlas.
        </p>
      </div>
    );
  }

  const { data: rows } = await admin
    .from("coach_profile_translations")
    .select("locale, bio, career_objectives, playing_style, methodology_analysis, analysis_author")
    .eq("coach_id", id);

  const source: CoachLocaleFields = {
    bio: (coach.bio as string | null) ?? "",
    careerObjectives: (coach.career_objectives as string | null) ?? "",
    playingStyle: (coach.playing_style as string | null) ?? "",
    methodologyAnalysis: (coach.methodology_analysis as string | null) ?? "",
    analysisAuthor: (coach.analysis_author as string | null) ?? "",
  };

  const empty = (): CoachLocaleFields => ({
    bio: "",
    careerObjectives: "",
    playingStyle: "",
    methodologyAnalysis: "",
    analysisAuthor: "",
  });

  const translations: Record<CoachTranslatableLocale, CoachLocaleFields> = {
    en: empty(),
    it: empty(),
    pt: empty(),
    de: empty(),
    fr: empty(),
    fi: empty(),
  };
  for (const r of rows ?? []) {
    const loc = r.locale as CoachTranslatableLocale;
    if (!LOCALES.includes(loc)) continue;
    translations[loc] = {
      bio: (r.bio as string | null) ?? "",
      careerObjectives: (r.career_objectives as string | null) ?? "",
      playingStyle: (r.playing_style as string | null) ?? "",
      methodologyAnalysis: (r.methodology_analysis as string | null) ?? "",
      analysisAuthor: (r.analysis_author as string | null) ?? "",
    };
  }

  return (
    <CoachTranslationsEditor
      coachName={coach.full_name as string}
      source={source}
      translations={translations}
      // Admin edits bypass the plan cap (adminSaveCoachTranslation never gates on
      // tier), so don't lock any locale here — 7 = every content locale.
      localeLimit={7}
      saveAction={adminSaveCoachTranslation.bind(null, id)}
      deleteAction={adminDeleteCoachTranslation.bind(null, id)}
    />
  );
}
