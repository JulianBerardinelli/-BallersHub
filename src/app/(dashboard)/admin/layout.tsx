import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

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
                      <AdminNavLink key={item.href} href={item.href} label={item.label} />
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

function AdminNavLink({ href, label }: { href: string; label: string }) {
  // clientless "active" by pathname via CSS fallback (keeps it simple in RSC)
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2 hover:bg-neutral-900 border border-neutral-800 data-[active=true]:bg-neutral-900"
      data-active={false}
    >
      {label}
    </Link>
  );
}
