import { createSupabaseAdmin } from "@/lib/supabase/admin";
import MarketProjectionSection from "@/app/[locale]/(dashboard)/dashboard/edit-profile/football-data/components/MarketProjectionSection";
import { formatAdminMarketValue } from "@/lib/admin/edit-data";
import { adminUpdateMarketValue } from "../actions";

export default async function AdminMarketValuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("player_profiles")
    .select("market_value_eur, career_objectives")
    .eq("id", id)
    .maybeSingle<{ market_value_eur: string | number | null; career_objectives: string | null }>();

  return (
    <MarketProjectionSection
      playerId={id}
      adminMode
      action={adminUpdateMarketValue}
      initialValues={{
        marketValue: formatAdminMarketValue(data?.market_value_eur ?? null),
        careerObjectives: data?.career_objectives ?? "",
      }}
    />
  );
}
