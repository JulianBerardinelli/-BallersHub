import { createSupabaseAdmin } from "@/lib/supabase/admin";
import PlanGate from "@/components/dashboard/plan/PlanGate";
import ProAssetsUploaderClient from "@/components/dashboard/client/media/ProAssetsUploaderClient";
import MultimediaManagerClient from "@/components/dashboard/client/media/MultimediaManagerClient";
import { isCatalogPhoto } from "@/lib/dashboard/catalog-photos";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import type { PlayerMedia } from "@/db/schema/media";
import { adminUploadPlayerAsset } from "../actions";

export default async function AdminMultimediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdmin();

  const { data: profile } = await admin
    .from("player_profiles")
    .select(
      "user_id, full_name, current_club, nationality, avatar_url, hero_url, model_url_1, model_url_2",
    )
    .eq("id", id)
    .maybeSingle<{
      user_id: string;
      full_name: string | null;
      current_club: string | null;
      nationality: string[] | null;
      avatar_url: string | null;
      hero_url: string | null;
      model_url_1: string | null;
      model_url_2: string | null;
    }>();

  const { data: rawMedia } = await admin
    .from("player_media")
    .select("*")
    .eq("player_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  const avatarUrl = profile?.avatar_url ?? null;
  // Same separation the player/public gallery uses: drop pro assets + avatar.
  const media = (rawMedia ?? [])
    .filter((item) => (item.type === "photo" ? isCatalogPhoto(item, avatarUrl) : true))
    .map(
      (item) =>
        ({
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
        }) as PlayerMedia,
    );

  const isPro = profile?.user_id
    ? resolvePlanAccess((await fetchDashboardState(admin, profile.user_id)).subscription ?? null)
        .isPro
    : false;

  const apiBase = `/api/admin/players/${id}/media`;

  return (
    <div className="space-y-6">
      {/* Pro assets (hero / model) — gated by the target player's plan. */}
      <PlanGate feature="proAssets">
        <ProAssetsUploaderClient
          currentHeroUrl={profile?.hero_url ?? null}
          currentModelUrl1={profile?.model_url_1 ?? null}
          currentModelUrl2={profile?.model_url_2 ?? null}
          playerId={id}
          userId={profile?.user_id ?? ""}
          action={adminUploadPlayerAsset}
        />
      </PlanGate>

      {/* Catalog gallery + videos (with the SEO modal), via the admin routes. */}
      <MultimediaManagerClient
        media={media}
        isPro={isPro}
        profileContext={{
          fullName: profile?.full_name ?? null,
          currentClub: profile?.current_club ?? null,
          nationality: Array.isArray(profile?.nationality)
            ? (profile?.nationality[0] ?? null)
            : (profile?.nationality ?? null),
        }}
        apiBase={apiBase}
      />
    </div>
  );
}
