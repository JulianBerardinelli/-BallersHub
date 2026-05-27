// /admin/blogger-whitelist
//
// Admin-only panel para gestionar quién puede escribir posts en el blog.
// Reemplaza el flujo manual de SQL (UPDATE user_profiles SET is_blogger=true)
// documentado en docs/blog/README.md §10.
//
// MVP-2 item #4. Mismo patrón que /admin/comp-accounts.

import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/auth";
import { listBloggers } from "@/app/actions/admin-blogger-whitelist";
import BloggerWhitelistClient from "./components/BloggerWhitelistClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Whitelist de bloggers · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminBloggerWhitelistPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/blogger-whitelist");
  const allowed = await isAdmin(user.id);
  if (!allowed) redirect("/dashboard");

  const list = await listBloggers();
  const initial = list.ok ? list.data : [];

  return (
    <main className="space-y-6 p-6 md:p-8">
      <header className="space-y-2 border-b border-bh-fg-4/40 pb-5">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-3">
          Admin · Blog
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          Whitelist de bloggers
        </h1>
        <p className="text-sm leading-[1.55] text-bh-fg-3">
          Gestioná quién puede escribir artículos en el blog. Al hacer
          whitelist se crea automáticamente la página de autor en{" "}
          <code className="rounded bg-bh-surface-2 px-1.5 py-0.5 text-[12px]">
            /blog/authors/&lt;slug&gt;
          </code>
          . Revocar el acceso no borra los posts publicados ni el author hub.
        </p>
      </header>

      <BloggerWhitelistClient initial={initial} />
    </main>
  );
}
