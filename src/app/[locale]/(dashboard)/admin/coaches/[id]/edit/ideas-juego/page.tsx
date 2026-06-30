import { redirect, notFound } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import CoachGameIdeasManager from "@/app/[locale]/(dashboard)/dashboard/coach/game-ideas/CoachGameIdeasManager";
import { loadCoachGameIdeasForEditor } from "@/lib/coach/game-ideas-data";
import { adminUpsertGameIdea, adminDeleteGameIdea } from "@/app/actions/admin-coach";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar ideas de juego - Ballers Hub" };

export default async function AdminCoachGameIdeasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/sign-in?redirect=/admin/coaches/${id}/edit/ideas-juego`);
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

  const ideas = await loadCoachGameIdeasForEditor(admin, id);

  // En admin no aplica el gate Pro/DT (el admin cura cualquier perfil). liveMode
  // → publica al instante (status='approved').
  return (
    <CoachGameIdeasManager
      ideas={ideas}
      isPro
      isHeadCoach
      liveMode
      upsertAction={adminUpsertGameIdea.bind(null, id)}
      deleteAction={adminDeleteGameIdea.bind(null, id)}
    />
  );
}
