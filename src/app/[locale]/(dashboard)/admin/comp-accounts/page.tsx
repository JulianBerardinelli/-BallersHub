// /admin/comp-accounts
//
// Admin-only panel to grant Pro access to specific users (friends, team
// members, partners) without going through Stripe / Mercado Pago.
// Real paying users are never touched by this surface — see the
// `assertCompSubscription` guard in the actions file.

import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/auth";
import { listCompAccounts } from "@/app/actions/admin-comp-accounts";
import CompAccountsClient from "./components/CompAccountsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cuentas de cortesía · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminCompAccountsPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/comp-accounts");
  const allowed = await isAdmin(user.id);
  if (!allowed) redirect("/dashboard");

  const list = await listCompAccounts();
  const initial = list.ok ? list.data : [];

  return (
    <main className="space-y-6 p-6 md:p-8">
      <header className="space-y-2 border-b border-bh-fg-4/40 pb-5">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-3">
          Admin · Cortesías
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          Cuentas de cortesía
        </h1>
        <p className="text-sm leading-[1.55] text-bh-fg-3">
          Otorgá acceso Pro a amigos, equipo o partners sin cobro. Usuarios
          que pagaron via Stripe o Mercado Pago no aparecen acá y no se
          pueden modificar desde este panel.
        </p>
      </header>

      <CompAccountsClient initial={initial} />
    </main>
  );
}
