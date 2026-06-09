import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import MultimediaManagerClient from "@/components/dashboard/client/media/MultimediaManagerClient";
import PageHeader from "@/components/dashboard/client/PageHeader";
import TaskCalloutList from "@/components/dashboard/client/TaskCalloutList";
import ArticlesManager from "@/components/dashboard/client/media/ArticlesManager";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { fetchPlayerTaskMetrics } from "@/lib/dashboard/client/metrics";
import {
  buildTaskContext,
  getPendingTasksForSection,
  type TaskProfileSnapshot,
} from "@/lib/dashboard/client/task-context";
import { evaluateDashboardTasks, orderTasksBySeverity } from "@/lib/dashboard/client/tasks";
import LockedSection from "@/components/dashboard/client/LockedSection";
import ProAssetsUploaderClient from "@/components/dashboard/client/media/ProAssetsUploaderClient";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolveDashboardAccess } from "@/lib/dashboard/client/permissions";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import PlanGate from "@/components/dashboard/plan/PlanGate";
import { isFounderEmail } from "@/lib/dashboard/founder-emails";
import { isCatalogPhoto } from "@/lib/dashboard/catalog-photos";

export default async function MultimediaPage() {
  const t = await getTranslations("dashboard");
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard/edit-profile/multimedia");

  const dashboardState = await fetchDashboardState(supabase, user.id);

  const profile = dashboardState.profile;
  const access = resolveDashboardAccess({
    profileStatus: profile?.status ?? null,
    hasProfile: Boolean(profile),
    applicationStatus: dashboardState.application?.status ?? null,
  });

  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("editProfile.multimediaTitle")}
          description={t("editProfile.multimediaNoProfileDescription")}
        />
        {access.profileLock ? <LockedSection {...access.profileLock} /> : null}
      </div>
    );
  }

  if (access.profileLock) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("editProfile.multimediaTitle")}
          description={t("editProfile.multimediaDescription")}
        />
        <LockedSection {...access.profileLock} />
      </div>
    );
  }

  const { data: rawMediaItemsFromDB } = await supabase
    .from("player_media")
    .select("*")
    .eq("player_id", profile.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  // Hide pro assets AND the avatar row from the catalog list so the
  // dashboard "Fotografías" tab matches what the public /[slug] gallery
  // shows. The avatar is managed from its own uploader (PageHeader) and
  // shouldn't count against the catalog cap.
  const avatarUrl = profile.avatar_url ?? null;
  const rawMediaItems = (rawMediaItemsFromDB || []).filter((item) => {
    if (item.type === "photo") return isCatalogPhoto(item, avatarUrl);
    return true; // videos pass through untouched
  });

  const { data: rawArticles } = await supabase
    .from("player_articles")
    .select("*")
    .eq("player_id", profile.id)
    .order("position", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false });

  // Persisted layout for the public Press & Notes module. Lives in
  // profile_sections_visibility.settings under section='press'.
  const { data: pressSectionRow } = await supabase
    .from("profile_sections_visibility")
    .select("settings")
    .eq("player_id", profile.id)
    .eq("section", "press")
    .maybeSingle();
  const initialPressLayout: "newspaper" | "cards" =
    pressSectionRow?.settings && typeof pressSectionRow.settings === "object" &&
    (pressSectionRow.settings as { layout?: string }).layout === "cards"
      ? "cards"
      : "newspaper";

  // Fetch pro assets explicitly because dashboard view might not have it yet
  const { data: profileWithProAssets } = await supabase
    .from("player_profiles")
    .select("hero_url, model_url_1, model_url_2")
    .eq("id", profile.id)
    .single();
  const currentHeroUrl = profileWithProAssets?.hero_url ?? null;
  const currentModelUrl1 = profileWithProAssets?.model_url_1 ?? null;
  const currentModelUrl2 = profileWithProAssets?.model_url_2 ?? null;

  // Map Supabase snake_case back to Drizzle's camelCase PlayerMedia type
  const mediaItems = (rawMediaItems || []).map((item) => ({
    id: item.id,
    playerId: item.player_id,
    type: item.type,
    url: item.url,
    title: item.title,
    altText: item.alt_text,
    tags: item.tags,
    provider: item.provider,
    seasonYear: item.season_year ?? null,
    position: item.position ?? 0,
    isPrimary: item.is_primary,
    isApproved: item.is_approved,
    isFlagged: item.is_flagged,
    reviewedBy: item.reviewed_by,
    createdAt: item.created_at ? new Date(item.created_at) : new Date(),
  }));

  const metrics = await fetchPlayerTaskMetrics(supabase, profile.id);

  const normalizedProfile: TaskProfileSnapshot = {
    id: profile.id,
    status: profile.status,
    slug: profile.slug ?? null,
    visibility: profile.visibility,
    full_name: profile.full_name ?? null,
    birth_date: profile.birth_date ?? null,
    nationality: profile.nationality ?? null,
    positions: profile.positions ?? null,
    current_club: profile.current_club ?? null,
    bio: profile.bio ?? null,
    avatar_url: profile.avatar_url ?? dashboardState.primaryPhotoUrl ?? null,
    foot: profile.foot ?? null,
    height_cm: profile.height_cm ?? null,
    weight_kg: profile.weight_kg ?? null,
  };

  const taskEvaluation = evaluateDashboardTasks(buildTaskContext(normalizedProfile, metrics));
  const pendingTasks = orderTasksBySeverity(getPendingTasksForSection(taskEvaluation, "multimedia"));
  const taskCallouts = pendingTasks.map((task) => ({
    id: task.id,
    severity: task.severity,
    title: task.title,
    description: task.description,
    href: task.href,
  }));

  const planAccess = resolvePlanAccess(dashboardState.subscription);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("editProfile.multimediaTitle")}
        description={t("editProfile.multimediaDescription")}
      />

      <TaskCalloutList tasks={taskCallouts} />

      <PlanGate feature="proAssets">
        <ProAssetsUploaderClient
          currentHeroUrl={currentHeroUrl}
          currentModelUrl1={currentModelUrl1}
          currentModelUrl2={currentModelUrl2}
          playerId={profile.id}
          userId={user.id}
        />
      </PlanGate>

      <MultimediaManagerClient
        media={mediaItems || []}
        isPro={planAccess.isPro}
        isFounder={isFounderEmail(user.email)}
        profileContext={{
          fullName: profile.full_name,
          currentClub: profile.current_club,
          nationality: Array.isArray(profile.nationality)
            ? profile.nationality[0]
            : profile.nationality,
        }}
      />

      <ArticlesManager
        articles={rawArticles || []}
        initialLayout={initialPressLayout}
        isPro={planAccess.isPro}
      />

    </div>
  );
}
