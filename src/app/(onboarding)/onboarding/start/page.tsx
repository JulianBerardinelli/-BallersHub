// src/app/onboarding/start/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import {
  hasActiveApplication,
  isApplicationApproved,
  isApplicationDraft,
  normalizeApplicationStatus,
} from "@/lib/dashboard/client/application-status";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";
import { db } from "@/lib/db";
import { agencyInvites, userProfiles, managerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/onboarding/start");

  // Check for pending multi-manager agency invites
  if (user.email) {
    const pendingInvite = await db.query.agencyInvites.findFirst({
      where: (inv, { eq, and }) =>
        and(eq(inv.email, user.email!), eq(inv.status, "pending")),
    });

    if (pendingInvite) {
      // 1. Auto-assign the user to the agency
      await db.update(userProfiles)
        .set({ role: "manager", agencyId: pendingInvite.agencyId })
        .where(eq(userProfiles.userId, user.id));
      
      // 2. Mark invite as accepted
      await db.update(agencyInvites)
        .set({ status: "accepted" })
        .where(eq(agencyInvites.id, pendingInvite.id));
        
      // 3. Create the empty manager profile
      const emailPrefix = user.email.split("@")[0];
      await db.insert(managerProfiles).values({
        userId: user.id,
        fullName: emailPrefix, // Will be updated by them in the dashboard
        contactEmail: user.email,
      });
        
      redirect("/dashboard");
    }
  }

  const dashboardState = await fetchDashboardState(supabase, user.id);
  const profile = dashboardState.profile;
  const application = dashboardState.application;
  
  const { data: managerApp } = await supabase
    .from("manager_applications")
    .select("status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const applicationStatus = normalizeApplicationStatus(application?.status ?? null);

  if (profile || isApplicationApproved(applicationStatus) || managerApp?.status === "approved") {
    redirect("/dashboard");
  }

  if (isApplicationDraft(applicationStatus)) {
    redirect("/onboarding/player/apply");
  }

  if (hasActiveApplication(applicationStatus) || managerApp?.status === "pending") {
    return (
      <main className="mx-auto max-w-xl space-y-6 p-8">
        <h1 className="text-2xl font-semibold">Solicitud en revisión</h1>
        <p className="text-neutral-400">
          Ya recibimos tu información y estamos validando tus datos. Podés seguir el estado desde tu panel y te avisaremos por
          correo electrónico cuando finalicemos la revisión.
        </p>
        <div className="pt-2">
           {managerApp?.status === "pending" ? (
             <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">
               Ver panel
             </Link>
           ) : (
             <Link href="/onboarding/player/apply" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">
               Ver solicitud
             </Link>
           )}
        </div>
        <div>
          <Link href="/dashboard" className="text-sm underline">
            Volver al dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Elegí tu tipo de cuenta</h1>
      <p className="text-neutral-400">Podés cambiarlo más tarde desde el Dashboard.</p>

      <div className="grid gap-3">
        <Link href="/onboarding/player/plan" className="rounded-md border px-4 py-3 hover:bg-neutral-900 transition-colors">
          Soy Jugador/a
        </Link>
        <Link href="/onboarding/manager/info" className="rounded-md border px-4 py-3 hover:bg-neutral-900 transition-colors">
          Soy Manager / Agencia
        </Link>
        <div className="rounded-md border px-4 py-3 opacity-60">Soy DT / Scout / Dirigente (próximamente)</div>
      </div>

      <div className="pt-4">
        <Link href="/dashboard" className="text-sm underline">Lo haré después</Link>
      </div>
    </main>
  );
}
