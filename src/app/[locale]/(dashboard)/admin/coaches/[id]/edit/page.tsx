import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import AdminCoachProfileForm, { type AdminCoachData } from "./AdminCoachProfileForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar entrenador - Ballers Hub" };

export default async function AdminCoachEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/sign-in?redirect=/admin/coaches/${id}/edit`);
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
      "id, slug, full_name, role_title, current_club, bio, playing_style, methodology_analysis, career_objectives, preferred_formations, status, visibility",
    )
    .eq("id", id)
    .maybeSingle();
  if (!coach) notFound();

  const data: AdminCoachData = {
    id: coach.id as string,
    slug: (coach.slug as string | null) ?? null,
    fullName: (coach.full_name as string) ?? "",
    roleTitle: (coach.role_title as string | null) ?? "",
    currentClub: (coach.current_club as string | null) ?? "",
    bio: (coach.bio as string | null) ?? "",
    playingStyle: (coach.playing_style as string | null) ?? "",
    methodologyAnalysis: (coach.methodology_analysis as string | null) ?? "",
    careerObjectives: (coach.career_objectives as string | null) ?? "",
    preferredFormations: Array.isArray(coach.preferred_formations)
      ? (coach.preferred_formations as string[]).join(", ")
      : "",
    status: (coach.status as AdminCoachData["status"]) ?? "approved",
    visibility: coach.visibility === "private" ? "private" : "public",
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/coaches" className="text-[12px] text-bh-fg-3 hover:text-bh-fg-1">
            ← Directorio de entrenadores
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">{data.fullName}</h1>
        </div>
        {data.slug && (
          <a
            href={`/coach/${data.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-bh-pill border border-white/[0.12] px-3 py-1.5 text-[12px] text-bh-fg-2 hover:border-white/[0.24]"
          >
            Ver perfil público ↗
          </a>
        )}
      </div>
      <AdminCoachProfileForm coach={data} />
    </main>
  );
}
