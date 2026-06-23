import { redirect, notFound } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { loadCoachCareerForEditor } from "@/lib/coach/career-data";
import CoachCareerManager from "@/app/[locale]/(dashboard)/dashboard/coach/career/CoachCareerManager";
import { adminSubmitCoachCareerLive } from "@/app/actions/admin-coach";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar trayectoria - Ballers Hub" };

export default async function AdminCoachCareerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/sign-in?redirect=/admin/coaches/${id}/edit/trayectoria`);
  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  const admin = createSupabaseAdmin();
  const { data: coach } = await admin
    .from("coach_profiles")
    .select("id, full_name")
    .eq("id", id)
    .maybeSingle<{ id: string; full_name: string }>();
  if (!coach) notFound();

  // Same rich loader the dashboard uses → identical team picker / division /
  // crests in the reused CareerEditor. Admin writes LIVE (no revision queue).
  const { stages, stats } = await loadCoachCareerForEditor(admin, id);

  return (
    <CoachCareerManager
      coachId={id}
      coachName={coach.full_name}
      career={stages}
      stats={stats}
      latestRequest={null}
      submitAction={adminSubmitCoachCareerLive}
      liveMode
    />
  );
}
