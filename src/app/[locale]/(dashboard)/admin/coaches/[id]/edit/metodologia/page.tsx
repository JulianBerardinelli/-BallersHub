import { redirect, notFound } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import CoachMethodologyManager from "@/app/[locale]/(dashboard)/dashboard/coach/methodology/CoachMethodologyManager";
import { loadCoachMethodologyForEditor } from "@/lib/coach/methodology-data";
import {
  adminUpsertMethodologyRubro,
  adminDeleteMethodologyRubro,
  adminRemoveMethodologyDoc,
} from "@/app/actions/admin-coach";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar metodología - Ballers Hub" };

export default async function AdminCoachMethodologyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/sign-in?redirect=/admin/coaches/${id}/edit/metodologia`);
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

  const rubros = await loadCoachMethodologyForEditor(admin, id);

  // En admin no aplica el cap Free (isPro=true): el equipo puede editar/agregar
  // cualquier cantidad de rubros y subir archivos. liveMode → publica al
  // instante (status='approved').
  return (
    <CoachMethodologyManager
      rubros={rubros}
      isPro
      liveMode
      upsertAction={adminUpsertMethodologyRubro.bind(null, id)}
      deleteAction={adminDeleteMethodologyRubro.bind(null, id)}
      removeDocAction={adminRemoveMethodologyDoc.bind(null, id)}
      uploadUrl={`/api/admin/coaches/${id}/methodology-doc/upload`}
    />
  );
}
