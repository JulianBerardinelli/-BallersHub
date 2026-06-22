import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import CoachLicensesModerationPanel, {
  type PendingCoachLicense,
} from "./CoachLicensesModerationPanel";
import CoachModerationHistory, {
  type ModerationHistoryEntry,
} from "../_components/CoachModerationHistory";

export const dynamic = "force-dynamic";

export default async function CoachLicensesModerationPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/coach-licenses");
  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: string | null }>();
  if (up?.role !== "admin" && up?.role !== "moderator") redirect("/dashboard");

  const admin = createSupabaseAdmin();
  const { data: rows } = await admin
    .from("coach_licenses")
    .select(
      "id, title, issuer, awarded_year, expires_year, doc_url, created_at, coach:coach_profiles ( full_name, slug )",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const items: PendingCoachLicense[] = (rows ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const coach = (r.coach ?? {}) as { full_name?: string; slug?: string | null };
    return {
      id: r.id as string,
      title: (r.title as string) ?? "",
      issuer: (r.issuer as string | null) ?? null,
      awardedYear: (r.awarded_year as number | null) ?? null,
      expiresYear: (r.expires_year as number | null) ?? null,
      docUrl: (r.doc_url as string | null) ?? null,
      coachName: coach.full_name ?? "—",
      slug: coach.slug ?? null,
    };
  });

  const { data: resolved } = await admin
    .from("coach_licenses")
    .select("id, title, issuer, status, rejection_reason, reviewed_at, coach:coach_profiles ( full_name, slug )")
    .in("status", ["approved", "rejected"])
    .order("reviewed_at", { ascending: false, nullsFirst: false })
    .limit(40);

  const history: ModerationHistoryEntry[] = (resolved ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const coach = (r.coach ?? {}) as { full_name?: string; slug?: string | null };
    return {
      id: r.id as string,
      primary: coach.full_name ?? "—",
      secondary: [(r.title as string | null) ?? null, (r.issuer as string | null) ?? null].filter(Boolean).join(" · ") || null,
      status: (r.status as string) ?? "approved",
      reason: (r.rejection_reason as string | null) ?? null,
      slug: coach.slug ?? null,
      at: (r.reviewed_at as string | null) ?? null,
    };
  });

  return (
    <div className="space-y-8">
      <CoachLicensesModerationPanel items={items} />
      <CoachModerationHistory entries={history} />
    </div>
  );
}
