import { redirect, notFound } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import CoachProfileEditor from "@/app/[locale]/(dashboard)/dashboard/coach/edit/CoachProfileEditor";
import { adminUpdateCoachProfileFields } from "@/app/actions/admin-coach";
import AdminCoachStatusCard from "../_components/AdminCoachStatusCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar entrenador - Ballers Hub" };

export default async function AdminCoachDatosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/sign-in?redirect=/admin/coaches/${id}/edit/datos`);
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
      "id, slug, full_name, status, visibility, avatar_url, hero_url, role_title, bio, playing_style, methodology_analysis, career_objectives, preferred_formations, theme_primary_color, theme_accent_color, theme_background_color",
    )
    .eq("id", id)
    .maybeSingle();
  if (!coach) notFound();

  const status = (["draft", "pending_review", "approved", "rejected"].includes(coach.status ?? "")
    ? coach.status
    : "approved") as "draft" | "pending_review" | "approved" | "rejected";
  const visibility = coach.visibility === "private" ? "private" : "public";

  return (
    <div className="space-y-6">
      <AdminCoachStatusCard coachId={id} status={status} visibility={visibility} />

      {/* Reuse of the dashboard editor (same UI), with admin service-role action +
          admin image endpoint injected — identical to how the player admin reuses
          its dashboard components. Plan/Notification providers come from the layout. */}
      <CoachProfileEditor
        initial={{
          fullName: coach.full_name as string,
          avatarUrl: (coach.avatar_url as string | null) ?? null,
          heroUrl: (coach.hero_url as string | null) ?? null,
          roleTitle: (coach.role_title as string | null) ?? null,
          bio: (coach.bio as string | null) ?? null,
          careerObjectives: (coach.career_objectives as string | null) ?? null,
          playingStyle: (coach.playing_style as string | null) ?? null,
          methodologyAnalysis: (coach.methodology_analysis as string | null) ?? null,
          preferredFormations: Array.isArray(coach.preferred_formations)
            ? (coach.preferred_formations as string[])
            : [],
          theme: {
            primaryColor: (coach.theme_primary_color as string | null) ?? null,
            accentColor: (coach.theme_accent_color as string | null) ?? null,
            backgroundColor: (coach.theme_background_color as string | null) ?? null,
          },
        }}
        action={adminUpdateCoachProfileFields.bind(null, id)}
        imageUploadUrl={`/api/admin/coaches/${id}/profile-image/upload`}
      />
    </div>
  );
}
