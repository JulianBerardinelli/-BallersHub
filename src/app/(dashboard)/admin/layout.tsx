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
    <div className="mx-auto max-w-7xl p-6 flex flex-col h-[calc(100vh-96px)]">
      <header className="mb-6 space-y-1 shrink-0">
        <h1 className="text-2xl font-semibold">Panel de administración</h1>
        <p className="text-sm text-neutral-500">
          Gestioná nuevas aplicaciones, actualizaciones de perfiles y el catálogo de equipos oficiales.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        <aside className="col-span-12 md:col-span-3 lg:col-span-2 overflow-y-auto pb-8 pr-2 custom-scrollbar">
          <nav className="space-y-6">
            {NAV_SECTIONS.map((section) => {
              const visibleItems = section.items.filter((item) => item.roles.includes(userRole as string));
              if (visibleItems.length === 0) return null;

              return (
                <div key={section.title} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {visibleItems.map((item) => (
                      <AdminNavLink key={item.href} href={item.href} label={item.label} badgeCount={counts[item.href]} />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <section className="col-span-12 md:col-span-9 lg:col-span-10 overflow-y-auto pb-12 pr-2 custom-scrollbar">{children}</section>
      </div>
    </div>
  );
}


