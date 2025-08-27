import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin");

  const { data: up } = await supabase
    .from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-7xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Panel de administración</h1>
        <p className="text-sm text-neutral-500">Gestioná solicitudes de jugadores y alta/edición de equipos.</p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-2">
          <nav className="sticky top-6 space-y-1">
            <AdminNavLink href="/admin/applications" label="Jugadores" />
            <AdminNavLink href="/admin/teams" label="Equipos" />
          </nav>
        </aside>

        {/* Content */}
        <section className="col-span-12 md:col-span-9 lg:col-span-10">
          {children}
        </section>
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
