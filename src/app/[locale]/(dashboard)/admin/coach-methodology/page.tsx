import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import MethodologyModerationPanel, { type PendingRubro } from "./MethodologyModerationPanel";

export const dynamic = "force-dynamic";

export default async function CoachMethodologyModerationPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/coach-methodology");
  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: string | null }>();
  if (up?.role !== "admin" && up?.role !== "moderator") redirect("/dashboard");

  const admin = createSupabaseAdmin();
  const { data: rows } = await admin
    .from("coach_methodology_rubros")
    .select(
      "id, title, icon, body, status, created_at, coach:coach_profiles ( full_name, slug ), docs:coach_media ( id, url, title, status )",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const items: PendingRubro[] = (rows ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const coach = (r.coach ?? {}) as { full_name?: string; slug?: string | null };
    const docs = ((r.docs ?? []) as Array<Record<string, unknown>>).map((d) => ({
      id: d.id as string,
      url: (d.url as string) ?? "",
      title: (d.title as string | null) ?? null,
      status: (d.status as string) ?? "pending",
    }));
    return {
      id: r.id as string,
      title: (r.title as string) ?? "",
      icon: (r.icon as string | null) ?? null,
      body: (r.body as string | null) ?? null,
      coachName: coach.full_name ?? "—",
      slug: coach.slug ?? null,
      docs,
    };
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Metodología DTs · pendientes
        </h2>
        <p className="text-sm text-bh-fg-3">
          Aprobá o rechazá los rubros de metodología. Los archivos adjuntos heredan la decisión del
          rubro.
        </p>
      </div>
      <MethodologyModerationPanel items={items} />
    </div>
  );
}
