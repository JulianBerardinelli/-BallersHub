import { createSupabaseServerRSC } from "@/lib/supabase/server";

import type { FooterLinkColumn } from "./FooterMarkup";

export type FooterCTAState =
  | { kind: "anonymous" }
  | { kind: "applicant"; status: "active" | "draft" }
  | { kind: "player"; slug: string | null }
  | { kind: "manager"; agencySlug: string | null }
  | { kind: "member" };

// Footer state used to call `db.query.*` via postgres-js. Under load on
// Vercel that driver occasionally left the pooler slot in a `ClientRead`
// wait state, blocking every subsequent request on the same lambda
// (admin pages started 504-ing because of this). All footer reads go
// through Supabase REST now — same project, different connection path,
// same RLS, no postgres-js bug.
export async function resolveFooterCTAState(): Promise<FooterCTAState> {
  try {
    const supabase = await createSupabaseServerRSC();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { kind: "anonymous" };

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, agency:agency_profiles(slug)")
      .eq("user_id", user.id)
      .maybeSingle();

    type AgencyRef = { slug: string | null } | { slug: string | null }[] | null;
    const agencyRef = (profile?.agency ?? null) as AgencyRef;
    const agencySlug = Array.isArray(agencyRef)
      ? agencyRef[0]?.slug ?? null
      : agencyRef?.slug ?? null;

    if (profile?.role === "manager") {
      return { kind: "manager", agencySlug };
    }

    const { data: managerApp } = await supabase
      .from("manager_applications")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (managerApp) {
      return { kind: "manager", agencySlug };
    }

    const { data: player } = await supabase
      .from("player_profiles")
      .select("slug, status, visibility")
      .eq("user_id", user.id)
      .maybeSingle();
    if (player && player.status === "approved" && player.visibility === "public") {
      return { kind: "player", slug: player.slug ?? null };
    }

    const { data: app } = await supabase
      .from("player_applications")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (app?.status === "draft") return { kind: "applicant", status: "draft" };
    if (app?.status) return { kind: "applicant", status: "active" };

    return { kind: "member" };
  } catch {
    // If anything goes wrong (e.g. db unreachable in a public route),
    // fall back to anonymous CTAs so the footer never breaks the page.
    return { kind: "anonymous" };
  }
}

export function buildLinkColumns(state: FooterCTAState): FooterLinkColumn[] {
  // "Crear perfil de jugador" only when the user does not already have one.
  const showCreatePlayer = state.kind !== "player";
  // "Crear agencia" only when the user is not a manager already.
  const showCreateAgency = state.kind !== "manager";

  const players: FooterLinkColumn = {
    title: "Para Jugadores",
    links: [
      ...(showCreatePlayer
        ? [{ label: "Crear perfil", href: "/onboarding/start" }]
        : []),
      { label: "Ver perfiles validados", href: "/players" },
      { label: "Editar trayectoria", href: "/dashboard/edit-profile/football-data" },
      { label: "Plantillas Pro", href: "/dashboard/edit-template/styles" },
    ],
  };

  const agencies: FooterLinkColumn = {
    title: "Para Agencias",
    links: [
      ...(showCreateAgency
        ? [{ label: "Crear agencia", href: "/onboarding/start" }]
        : []),
      { label: "Mi cartera", href: "/dashboard/players" },
      { label: "Verificación oficial", href: "/dashboard/agency" },
      { label: "Demo", href: "/about" },
    ],
  };

  const work: FooterLinkColumn = {
    title: "Trabajar",
    links: [
      { label: "Carreras", href: "/about", badge: "Hiring" },
      { label: "Partners", href: "/about" },
      { label: "Embajadores", href: "/about" },
      { label: "Prensa", href: "/about" },
    ],
  };

  return [players, agencies, work];
}
