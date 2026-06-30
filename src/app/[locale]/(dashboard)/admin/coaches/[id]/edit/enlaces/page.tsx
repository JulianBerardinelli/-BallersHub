import { redirect, notFound } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import CoachLinksManager, {
  type CoachLinkRow,
} from "@/app/[locale]/(dashboard)/dashboard/coach/links/CoachLinksManager";
import {
  adminUpsertCoachLink,
  adminDeleteCoachLink,
} from "@/app/actions/coach-links";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar enlaces - Ballers Hub" };

type CoachLinkSelect = {
  id: string;
  label: string | null;
  url: string;
  kind: string;
  is_primary: boolean | null;
};

export default async function AdminCoachLinksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/sign-in?redirect=/admin/coaches/${id}/edit/enlaces`);
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

  const { data: linkRows } = await admin
    .from("coach_links")
    .select("id, label, url, kind, is_primary")
    .eq("coach_id", id)
    .order("kind", { ascending: true });

  const links: CoachLinkRow[] = ((linkRows ?? []) as CoachLinkSelect[]).map((l) => ({
    id: l.id,
    label: l.label ?? null,
    url: l.url,
    kind: l.kind,
    isPrimary: Boolean(l.is_primary),
  }));

  return (
    <CoachLinksManager
      links={links}
      upsertAction={adminUpsertCoachLink.bind(null, id)}
      deleteAction={adminDeleteCoachLink.bind(null, id)}
      liveMode
    />
  );
}
