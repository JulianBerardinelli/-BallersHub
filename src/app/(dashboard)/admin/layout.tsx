import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminNavLink } from "./AdminNavLink";

type NavSection = {
  title: string;
  items: { href: string; label: string; roles: string[] }[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Directorio",
    items: [
      { href: "/admin/players", label: "Jugadores", roles: ["admin", "moderator"] },
      { href: "/admin/teams", label: "Equipos", roles: ["admin", "moderator"] },
      { href: "/admin/divisions", label: "Divisiones", roles: ["admin", "moderator"] },
    ],
  },
  {
    title: "Onboarding",
    items: [
      { href: "/admin/applications", label: "Solicitudes de Jugadores", roles: ["admin"] },
      { href: "/admin/manager-applications", label: "Verificación Managers", roles: ["admin"] },
      { href: "/admin/career", label: "Trayectorias pendientes", roles: ["admin", "analyst"] },
      { href: "/admin/agency-team-proposals", label: "Equipos de Agencias", roles: ["admin", "analyst"] },
    ],
  },
  {
    title: "Perfiles activos",
    items: [
      { href: "/admin/revisions", label: "Revisiones de trayectoria", roles: ["admin", "analyst"] },
      { href: "/admin/stats-revisions", label: "Revisiones de estadísticas", roles: ["admin", "analyst"] },
      { href: "/admin/media-moderation", label: "Moderación multimedia", roles: ["admin", "moderator"] },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/admin/marketing", label: "Campañas", roles: ["admin"] },
      { href: "/admin/marketing/drips", label: "Drips automatizados", roles: ["admin"] },
    ],
  },
  {
    title: "Billing",
    items: [
      { href: "/admin/comp-accounts", label: "Cuentas de cortesía", roles: ["admin"] },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin");

  const { data: up } = await supabase
    .from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  
  const userRole = up?.role;
  const allowedRoles = ["admin", "moderator", "analyst"];

  if (!userRole || !allowedRoles.includes(userRole)) {
    redirect("/dashboard");
  }

  const [
    { count: appCount },
    { count: managerAppCount },
    { count: careerItemCount },
    { data: revisionsData },
    { count: mediaCount },
    { count: teamsCount },
    { count: divisionsCount }
  ] = await Promise.all([
    supabase.from("player_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("manager_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("career_item_proposals").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("career_revision_requests").select("id, career_revision_items(id), stats_revision_items(id)").eq("status", "pending"),
    supabase.from("player_media").select("id", { count: "exact", head: true }).is("reviewed_by", null),
    supabase.from("teams").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("divisions").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  let careerRevisionsCount = 0;
  let statsRevisionsCount = 0;

  if (revisionsData) {
    revisionsData.forEach((row: { career_revision_items: { id: string }[] | null, stats_revision_items: { id: string }[] | null }) => {
      if (row.career_revision_items && row.career_revision_items.length > 0) careerRevisionsCount++;
      if (row.stats_revision_items && row.stats_revision_items.length > 0) statsRevisionsCount++;
    });
  }

  const counts: Record<string, number> = {
    "/admin/applications": appCount || 0,
    "/admin/manager-applications": managerAppCount || 0,
    "/admin/career": careerItemCount || 0,
    "/admin/revisions": careerRevisionsCount,
    "/admin/stats-revisions": statsRevisionsCount,
    "/admin/media-moderation": mediaCount || 0,
    "/admin/teams": teamsCount || 0,
    "/admin/divisions": divisionsCount || 0,
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-7">
      {/* Header — full width, scrolls with the page */}
      <header className="mb-6 space-y-2">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
          Admin
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          Panel de <span className="text-bh-lime">administración</span>
        </h1>
        <p className="text-sm leading-[1.55] text-bh-fg-3">
          Gestioná nuevas aplicaciones, actualizaciones de perfiles y el
          catálogo de equipos oficiales.
        </p>
      </header>

      {/* Floating sidebar + content */}
      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="md:w-[240px] md:shrink-0">
          <div className="sticky top-24 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-3">
            <nav className="space-y-5">
              {NAV_SECTIONS.map((section) => {
                const visibleItems = section.items.filter((item) =>
                  item.roles.includes(userRole as string),
                );
                if (visibleItems.length === 0) return null;

                return (
                  <div key={section.title} className="space-y-1.5">
                    <p className="px-2 font-bh-display text-[10px] font-bold uppercase tracking-[0.14em] text-bh-fg-4">
                      {section.title}
                    </p>
                    <div className="space-y-0.5">
                      {visibleItems.map((item) => (
                        <AdminNavLink
                          key={item.href}
                          href={item.href}
                          label={item.label}
                          badgeCount={counts[item.href]}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </div>
  );
}


