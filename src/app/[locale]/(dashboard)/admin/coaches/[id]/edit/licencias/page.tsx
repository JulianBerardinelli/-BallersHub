import { redirect, notFound } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import CoachLicensesManager, {
  type CoachLicenseRow,
} from "@/app/[locale]/(dashboard)/dashboard/coach/licenses/CoachLicensesManager";
import {
  adminUpsertCoachLicense,
  adminDeleteCoachLicense,
} from "@/app/actions/admin-coach";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar licencias - Ballers Hub" };

export default async function AdminCoachLicensesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/sign-in?redirect=/admin/coaches/${id}/edit/licencias`);
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

  const { data: rows } = await admin
    .from("coach_licenses")
    .select("id, title, issuer, awarded_year, expires_year, doc_url, status, rejection_reason")
    .eq("coach_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  const licenses: CoachLicenseRow[] = (rows ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: x.id as string,
      title: (x.title as string) ?? "",
      issuer: (x.issuer as string | null) ?? "",
      awardedYear: (x.awarded_year as number | null) ?? null,
      expiresYear: (x.expires_year as number | null) ?? null,
      docUrl: (x.doc_url as string | null) ?? null,
      status: (x.status as "pending" | "approved" | "rejected") ?? "pending",
      rejectionReason: (x.rejection_reason as string | null) ?? null,
    };
  });

  return (
    <CoachLicensesManager
      licenses={licenses}
      upsertAction={adminUpsertCoachLicense.bind(null, id)}
      deleteAction={adminDeleteCoachLicense.bind(null, id)}
      uploadUrl={`/api/admin/coaches/${id}/license-doc/upload`}
      liveMode
    />
  );
}
