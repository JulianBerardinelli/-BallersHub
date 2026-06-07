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

// Translator type — the subset of next-intl's `t` we use here (plain key
// lookups). Accepting this instead of the full type keeps the helper
// decoupled from next-intl internals.
type Translator = (key: string) => string;

export function buildLinkColumns(
  state: FooterCTAState,
  t: Translator,
): FooterLinkColumn[] {
  // "Crear perfil de jugador" only when the user does not already have one.
  const showCreatePlayer = state.kind !== "player";
  // "Crear agencia" only when the user is not a manager already.
  const showCreateAgency = state.kind !== "manager";

  const players: FooterLinkColumn = {
    title: t("columns.playersTitle"),
    links: [
      ...(showCreatePlayer
        ? [{ label: t("columns.createProfile"), href: "/onboarding/start" }]
        : []),
      { label: t("columns.viewValidated"), href: "/players" },
      { label: t("columns.editCareer"), href: "/dashboard/edit-profile/football-data" },
      { label: t("columns.proTemplates"), href: "/dashboard/edit-template/styles" },
    ],
  };

  const agencies: FooterLinkColumn = {
    title: t("columns.agenciesTitle"),
    links: [
      ...(showCreateAgency
        ? [{ label: t("columns.createAgency"), href: "/onboarding/start" }]
        : []),
      { label: t("columns.viewAgencies"), href: "/agencies" },
      { label: t("columns.myRoster"), href: "/dashboard/players" },
      { label: t("columns.officialVerification"), href: "/dashboard/agency" },
      { label: t("columns.demo"), href: "/about" },
    ],
  };

  const work: FooterLinkColumn = {
    title: t("columns.workTitle"),
    links: [
      { label: t("columns.careers"), href: "/about", badge: "Hiring" },
      { label: t("columns.partners"), href: "/about" },
      { label: t("columns.ambassadors"), href: "/about" },
      { label: t("columns.press"), href: "/about" },
    ],
  };

  return [players, agencies, work];
}
