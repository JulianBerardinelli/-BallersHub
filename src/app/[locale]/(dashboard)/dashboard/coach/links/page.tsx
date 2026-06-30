import { redirect } from "next/navigation";

import { createSupabaseServerRSC } from "@/lib/supabase/server";
import CoachLinksManager, {
  type CoachLinkRow,
} from "./CoachLinksManager";

export const dynamic = "force-dynamic";

type CoachLinkSelect = {
  id: string;
  label: string | null;
  url: string;
  kind: string;
  is_primary: boolean | null;
};

export default async function CoachLinksPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/dashboard/coach/links");

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!coach) {
    return (
      <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-3">
        Tu perfil de entrenador todavía no está activo. Cuando el equipo apruebe tu
        solicitud vas a poder gestionar tus enlaces externos desde acá.
      </div>
    );
  }

  const { data: linkRows } = await supabase
    .from("coach_links")
    .select("id, label, url, kind, is_primary")
    .eq("coach_id", coach.id)
    .order("kind", { ascending: true });

  const links: CoachLinkRow[] = ((linkRows ?? []) as CoachLinkSelect[]).map((l) => ({
    id: l.id,
    label: l.label ?? null,
    url: l.url,
    kind: l.kind,
    isPrimary: Boolean(l.is_primary),
  }));

  return <CoachLinksManager links={links} />;
}
