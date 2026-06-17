import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import CoachMediaManager, { type CoachMediaItem } from "./CoachMediaManager";

export const dynamic = "force-dynamic";

export default async function CoachMultimediaPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/dashboard/coach/multimedia");

  const { data: profile } = await supabase
    .from("coach_profiles")
    .select("id, full_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; full_name: string }>();

  if (!profile) {
    return (
      <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-3">
        Tu perfil de entrenador todavía no está activo. Cuando el equipo apruebe tu solicitud vas a
        poder subir fotos y videos desde acá.
      </div>
    );
  }

  const { data: rows } = await supabase
    .from("coach_media")
    .select("id, type, url, title, status, rejection_reason, season_year, provider")
    .eq("coach_id", profile.id)
    .order("created_at", { ascending: false });

  const items: CoachMediaItem[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    type: (r.type as "photo" | "video" | "doc") ?? "photo",
    url: (r.url as string) ?? "",
    title: (r.title as string | null) ?? null,
    status: (r.status as "pending" | "approved" | "rejected") ?? "pending",
    rejectionReason: (r.rejection_reason as string | null) ?? null,
    seasonYear: (r.season_year as number | null) ?? null,
    provider: (r.provider as string | null) ?? null,
  }));

  return <CoachMediaManager items={items} />;
}
