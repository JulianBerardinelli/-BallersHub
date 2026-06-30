import { redirect, notFound } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import CoachHonoursManager from "@/app/[locale]/(dashboard)/dashboard/coach/honours/CoachHonoursManager";
import { loadCoachHonoursForEditor, loadCoachCareerOptions } from "@/lib/coach/honours-data";
import { adminUpsertHonour, adminDeleteHonour } from "@/app/actions/admin-coach";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar logros - Ballers Hub" };

export default async function AdminCoachHonoursPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/sign-in?redirect=/admin/coaches/${id}/edit/logros`);
  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  const admin = createSupabaseAdmin();
  const { data: coach } = await admin
    .from("coach_profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle<{ id: string }>();
  if (!coach) notFound();

  const [honours, careerOptions] = await Promise.all([
    loadCoachHonoursForEditor(admin, id),
    loadCoachCareerOptions(admin, id),
  ]);

  // liveMode → publica al instante (status='approved').
  return (
    <CoachHonoursManager
      honours={honours}
      careerOptions={careerOptions}
      liveMode
      upsertAction={adminUpsertHonour.bind(null, id)}
      deleteAction={adminDeleteHonour.bind(null, id)}
    />
  );
}
