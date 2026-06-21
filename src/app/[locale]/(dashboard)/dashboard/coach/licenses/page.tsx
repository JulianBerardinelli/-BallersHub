import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import CoachLicensesManager, { type CoachLicenseRow } from "./CoachLicensesManager";

export const dynamic = "force-dynamic";

export default async function CoachLicensesPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/dashboard/coach/licenses");

  const { data: profile } = await supabase
    .from("coach_profiles")
    .select("id, full_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; full_name: string }>();

  if (!profile) {
    return (
      <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-3">
        Tu perfil de entrenador todavía no está activo. Cuando el equipo apruebe tu solicitud vas a
        poder cargar tus licencias desde acá.
      </div>
    );
  }

  const { data: rows } = await supabase
    .from("coach_licenses")
    .select("id, title, issuer, awarded_year, expires_year, doc_url, status, rejection_reason")
    .eq("coach_id", profile.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  const licenses: CoachLicenseRow[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    title: (r.title as string) ?? "",
    issuer: (r.issuer as string | null) ?? "",
    awardedYear: (r.awarded_year as number | null) ?? null,
    expiresYear: (r.expires_year as number | null) ?? null,
    docUrl: (r.doc_url as string | null) ?? null,
    status: (r.status as "pending" | "approved" | "rejected") ?? "pending",
    rejectionReason: (r.rejection_reason as string | null) ?? null,
  }));

  return <CoachLicensesManager licenses={licenses} />;
}
