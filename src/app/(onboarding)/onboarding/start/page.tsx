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
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-bh-pill border border-[rgba(0,194,255,0.22)] bg-[rgba(0,194,255,0.08)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-blue">
            En revisión
          </span>
          <h1 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
            Solicitud <span className="text-bh-lime">en revisión</span>
          </h1>
          <p className="text-sm leading-[1.6] text-bh-fg-3">
            Ya recibimos tu información y estamos validando tus datos. Podés
            seguir el estado desde tu panel y te avisaremos por correo cuando
            finalicemos la revisión.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {managerApp?.status === "pending" ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-bh-md bg-bh-lime px-5 py-2.5 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
            >
              Ver panel
            </Link>
          ) : (
            <Link
              href="/onboarding/player/apply"
              className="inline-flex items-center gap-2 rounded-bh-md bg-bh-lime px-5 py-2.5 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
            >
              Ver solicitud
            </Link>
          )}
          <Link
            href="/dashboard"
            className="text-[13px] text-bh-fg-3 underline-offset-4 transition-colors hover:text-bh-fg-1 hover:underline"
          >
            Volver al dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl space-y-7 p-8">
      <div className="space-y-2">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
          Onboarding
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          Elegí tu <span className="text-bh-lime">tipo de cuenta</span>
        </h1>
        <p className="text-sm leading-[1.6] text-bh-fg-3">
          Podés cambiarlo más tarde desde el dashboard.
        </p>
      </div>

      <div className="grid gap-3">
        <Link
          href="/onboarding/player/plan"
          className="bh-card-lift group flex items-center justify-between gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 px-5 py-4 transition-colors"
        >
          <div className="space-y-0.5">
            <div className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1 group-hover:text-bh-lime transition-colors">
              Soy Jugador/a
            </div>
            <div className="text-xs text-bh-fg-3">
              Construí tu portfolio profesional y conectate con clubes.
            </div>
          </div>
          <span className="text-bh-fg-3 transition-colors group-hover:text-bh-lime">
            →
          </span>
        </Link>
        <Link
          href="/onboarding/manager/info"
          className="bh-card-lift group flex items-center justify-between gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 px-5 py-4 transition-colors"
        >
          <div className="space-y-0.5">
            <div className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1 group-hover:text-bh-blue transition-colors">
              Soy Manager / Agencia
            </div>
            <div className="text-xs text-bh-fg-3">
              Gestioná tu roster, validá perfiles y representá talento.
            </div>
          </div>
          <span className="text-bh-fg-3 transition-colors group-hover:text-bh-blue">
            →
          </span>
        </Link>
        <div className="flex items-center justify-between gap-4 rounded-bh-lg border border-dashed border-white/[0.06] bg-transparent px-5 py-4 opacity-60">
          <div className="space-y-0.5">
            <div className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-3">
              Soy DT / Scout / Dirigente
            </div>
            <div className="text-xs text-bh-fg-4">Próximamente.</div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Link
          href="/dashboard"
          className="text-[13px] text-bh-fg-3 underline-offset-4 transition-colors hover:text-bh-fg-1 hover:underline"
        >
          Lo haré después
        </Link>
      </div>
    </main>
  );
}
