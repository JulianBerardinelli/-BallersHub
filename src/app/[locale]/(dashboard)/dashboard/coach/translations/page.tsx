import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { loadCoachPlanAccess } from "@/lib/dashboard/coach-plan";
import { buildUpgradeUrl } from "@/lib/dashboard/plan-access";
import { translationLocaleLimit } from "@/lib/i18n/translation-limits";
import CoachTranslationsEditor, {
  type CoachLocaleFields,
  type CoachTranslatableLocale,
  type RubroForTranslation,
} from "./CoachTranslationsEditor";

export const dynamic = "force-dynamic";

const LOCALES: CoachTranslatableLocale[] = ["en", "it", "pt", "de", "fr", "fi"];

export default async function CoachTranslationsPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/dashboard/coach/translations");

  const { data: profile } = await supabase
    .from("coach_profiles")
    .select("id, slug, full_name, bio, career_objectives, playing_style, methodology_analysis, analysis_author")
    .eq("user_id", user.id)
    .maybeSingle<{
      id: string;
      slug: string | null;
      full_name: string;
      bio: string | null;
      career_objectives: string | null;
      playing_style: string | null;
      methodology_analysis: string | null;
      analysis_author: string | null;
    }>();

  if (!profile) {
    return (
      <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-3">
        Tu perfil de entrenador todavía no está activo. Cuando el equipo apruebe tu solicitud vas a
        poder traducir tu página desde acá.
      </div>
    );
  }

  const access = await loadCoachPlanAccess(supabase, user.id);
  if (!access.isPro) {
    return (
      <div className="space-y-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6">
        <h2 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Idiomas · disponible en Pro
        </h2>
        <p className="text-sm text-bh-fg-3">
          Publicá tu página de entrenador en inglés, italiano y portugués para llegar a clubes y
          agencias de otros mercados. Tu contenido en español ya está publicado.
        </p>
        <Link
          href={buildUpgradeUrl({ audience: "coach", feature: "coach-translations" })}
          className="inline-flex w-fit items-center rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]"
        >
          Mejorar a Pro
        </Link>
      </div>
    );
  }

  const { data: rows } = await supabase
    .from("coach_profile_translations")
    .select("locale, bio, career_objectives, playing_style, methodology_analysis, analysis_author")
    .eq("coach_id", profile.id);

  const source: CoachLocaleFields = {
    bio: profile.bio ?? "",
    careerObjectives: profile.career_objectives ?? "",
    playingStyle: profile.playing_style ?? "",
    methodologyAnalysis: profile.methodology_analysis ?? "",
    analysisAuthor: profile.analysis_author ?? "",
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

  // Rubros de metodología + sus traducciones (contenido multi-fila).
  const { data: rubroRows } = await supabase
    .from("coach_methodology_rubros")
    .select("id, title, body")
    .eq("coach_id", profile.id)
    .order("position", { ascending: true });
  const rubroIds = (rubroRows ?? []).map((r) => r.id as string);
  const { data: rubroTrRows } = rubroIds.length
    ? await supabase
        .from("coach_methodology_rubro_translations")
        .select("rubro_id, locale, title, body")
        .in("rubro_id", rubroIds)
    : { data: [] as Array<{ rubro_id: string; locale: string; title: string | null; body: string | null }> };
  const rubroTrMap = new Map<string, Record<string, { title: string; body: string }>>();
  for (const t of rubroTrRows ?? []) {
    const row = t as { rubro_id: string; locale: string; title: string | null; body: string | null };
    const m = rubroTrMap.get(row.rubro_id) ?? {};
    m[row.locale] = { title: row.title ?? "", body: row.body ?? "" };
    rubroTrMap.set(row.rubro_id, m);
  }
  const rubros: RubroForTranslation[] = (rubroRows ?? []).map((r) => {
    const row = r as { id: string; title: string | null; body: string | null };
    return {
      id: row.id,
      title: row.title ?? "",
      body: row.body ?? "",
      translations: rubroTrMap.get(row.id) ?? {},
    };
  });

  return (
    <CoachTranslationsEditor
      coachName={profile.full_name}
      source={source}
      translations={translations}
      rubros={rubros}
      localeLimit={translationLocaleLimit({ slug: profile.slug, email: user.email })}
    />
  );
}
