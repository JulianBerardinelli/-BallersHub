import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import CoachesTableUI from "./CoachesTableUI";
import type { CoachAdminRow, CoachAdminStatus } from "./types";

export const metadata = { title: "Directorio de DTs - Ballers Hub" };

type RawCoach = {
  id: string;
  user_id: string;
  slug: string;
  full_name: string;
  role_title: string | null;
  nationality: string[] | null;
  current_club: string | null;
  status: string | null;
  visibility: string | null;
  avatar_url: string | null;
  created_at: string;
  plan_public: string | null;
};

export default async function AdminCoachesPage() {
  noStore();
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/coaches");

  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  const { data, error } = await supabase
    .from("coach_profiles")
    .select(
      "id, user_id, slug, full_name, role_title, nationality, current_club, status, visibility, avatar_url, created_at, plan_public",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="p-8">
        <p className="text-bh-danger">{error.message}</p>
      </main>
    );
  }

  const rows = (data ?? []) as RawCoach[];
  const items: CoachAdminRow[] = rows.map((c) => ({
    id: c.id,
    user_id: c.user_id,
    slug: c.slug,
    full_name: c.full_name,
    role_title: c.role_title,
    nationality: Array.isArray(c.nationality) ? c.nationality : [],
    current_club: c.current_club,
    status: ((["draft", "pending_review", "approved", "rejected"].includes(c.status ?? "")
      ? c.status
      : "approved") as CoachAdminStatus),
    visibility: c.visibility === "private" ? "private" : "public",
    avatar_url: c.avatar_url || "/images/coach-default.jpg",
    created_at: c.created_at,
    plan: c.plan_public === "pro" || c.plan_public === "pro_plus" ? "pro" : "free",
  }));

  return (
    <main className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-white">Directorio de Entrenadores</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Catálogo global de DTs. Editá su perfil, trayectoria y multimedia, o abrí su página pública.
        </p>
      </div>
      <CoachesTableUI items={items} />
    </main>
  );
}
