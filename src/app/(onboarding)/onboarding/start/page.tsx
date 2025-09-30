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

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/onboarding/start");

  const dashboardState = await fetchDashboardState(supabase, user.id);
  const profile = dashboardState.profile;
  const application = dashboardState.application;
  const applicationStatus = normalizeApplicationStatus(application?.status ?? null);

  if (profile || isApplicationApproved(applicationStatus)) {
    redirect("/dashboard");
  }

  if (isApplicationDraft(applicationStatus)) {
    redirect("/onboarding/player/apply");
  }

  if (hasActiveApplication(applicationStatus)) {
    return (
      <main className="mx-auto max-w-xl space-y-6 p-8">
        <h1 className="text-2xl font-semibold">Solicitud en revisión</h1>
        <p className="text-neutral-400">
          Ya recibimos tu información y estamos validando tus datos. Podés seguir el estado desde tu panel y te avisaremos por
          correo electrónico cuando finalicemos la revisión.
        </p>
        <div className="pt-2">
          <Link href="/onboarding/player/apply" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">
            Ver solicitud
          </Link>
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
        <Link href="/onboarding/player/plan" className="rounded-md border px-4 py-3 hover:bg-neutral-900">
          Soy Jugador/a
        </Link>
        <div className="rounded-md border px-4 py-3 opacity-60">Soy DT / Scout / Dirigente (próximamente)</div>
      </div>

      <div className="pt-4">
        <Link href="/dashboard" className="text-sm underline">Lo haré después</Link>
      </div>
    </main>
  );
}
