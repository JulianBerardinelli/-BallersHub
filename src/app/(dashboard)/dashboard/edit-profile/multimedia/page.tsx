import { redirect } from "next/navigation";
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
import HeroAssetUploaderClient from "@/components/dashboard/client/media/HeroAssetUploaderClient";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolveDashboardAccess } from "@/lib/dashboard/client/permissions";

export default async function MultimediaPage() {
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
          title="Multimedia"
          description="Creá tu perfil para gestionar galerías, videos y notas de prensa."
        />
        {access.profileLock ? <LockedSection {...access.profileLock} /> : null}
      </div>
    );
  }

  if (access.profileLock) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Multimedia"
          description="Centralizá imágenes, videos y artículos destacados para potenciar tu presencia digital."
        />
        <LockedSection {...access.profileLock} />
      </div>
    );
  }

  const { data: rawMediaItems } = await supabase
    .from("player_media")
    .select("*")
    .eq("player_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: rawArticles } = await supabase
    .from("player_articles")
    .select("*")
    .eq("player_id", profile.id)
    .order("published_at", { ascending: false, nullsFirst: false });

  // Fetch hero url explicitly because dashboard view might not have it yet
  const { data: profileWithHero } = await supabase
    .from("player_profiles")
    .select("hero_url")
    .eq("id", profile.id)
    .single();
  const currentHeroUrl = profileWithHero?.hero_url ?? null;

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Multimedia"
        description="Centralizá imágenes, videos y artículos destacados para potenciar tu presencia digital."
      />

      <TaskCalloutList tasks={taskCallouts} />

      <HeroAssetUploaderClient currentHeroUrl={currentHeroUrl} playerId={profile.id} userId={user.id} />

      <MultimediaManagerClient 
        media={mediaItems || []} 
        profileContext={{
          fullName: profile.full_name,
          currentClub: profile.current_club,
          nationality: Array.isArray(profile.nationality) 
            ? profile.nationality[0] 
            : profile.nationality,
        }}
      />

      <ArticlesManager articles={rawArticles || []} />

    </div>
  );
}
