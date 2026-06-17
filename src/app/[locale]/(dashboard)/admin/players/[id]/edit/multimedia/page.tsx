import { createSupabaseAdmin } from "@/lib/supabase/admin";
import PlanGate from "@/components/dashboard/plan/PlanGate";
import ProAssetsUploaderClient from "@/components/dashboard/client/media/ProAssetsUploaderClient";
import { adminUploadPlayerAsset } from "../actions";

export default async function AdminMultimediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("player_profiles")
    .select("user_id, hero_url, model_url_1, model_url_2")
    .eq("id", id)
    .maybeSingle<{
      user_id: string;
      hero_url: string | null;
      model_url_1: string | null;
      model_url_2: string | null;
    }>();

  return (
    // Gate by the TARGET player's plan (provided by the edit layout): Pro assets
    // are blurred/locked for a Free player, same as they'd see.
    <PlanGate feature="proAssets">
      <ProAssetsUploaderClient
        currentHeroUrl={data?.hero_url ?? null}
        currentModelUrl1={data?.model_url_1 ?? null}
        currentModelUrl2={data?.model_url_2 ?? null}
        playerId={id}
        userId={data?.user_id ?? ""}
        action={adminUploadPlayerAsset}
      />
    </PlanGate>
  );
}
