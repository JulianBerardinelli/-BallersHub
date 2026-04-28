// src/app/onboarding/plan/page.tsx
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

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "Gratis",
    description: "Solicitá verificación y publicá tu perfil profesional.",
    href: "/onboarding/player/apply",
    cta: "Empezar",
    accent: "lime" as const,
    available: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "Próximamente",
    description: "Reseñas verificadas, métricas avanzadas y prioridad en scouting.",
    href: "/billing/checkout?plan=pro",
    cta: "Notificarme",
    accent: "blue" as const,
    available: false,
  },
  {
    id: "pro_plus",
    name: "Pro+",
    price: "Próximamente",
    description: "Plantilla premium, análisis táctico y video destacado.",
    href: "/billing/checkout?plan=pro_plus",
    cta: "Notificarme",
    accent: "blue" as const,
    available: false,
  },
];

export default async function PlayerPlanPage() {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/onboarding/player/plan");

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
    redirect("/onboarding/start");
  }

  return (
    <main className="mx-auto max-w-2xl space-y-7 p-8">
      <div className="space-y-2">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
          Jugador
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          Elegí tu <span className="text-bh-lime">plan</span>
        </h1>
        <p className="text-sm leading-[1.6] text-bh-fg-3">
          Empezá gratis con la verificación. Pasá a Pro cuando quieras
          desbloquear visibilidad y herramientas avanzadas.
        </p>
      </div>

      <div className="grid gap-3">
        {PLANS.map((plan) => {
          const cardClass = plan.available
            ? "bh-card-lift border-white/[0.08] bg-bh-surface-1"
            : "border-dashed border-white/[0.08] bg-transparent opacity-60";
          const accentText =
            plan.accent === "lime" ? "text-bh-lime" : "text-bh-blue";
          return (
            <Link
              key={plan.id}
              href={plan.href}
              className={`group flex items-center justify-between gap-4 rounded-bh-lg border px-5 py-4 transition-colors ${cardClass}`}
            >
              <div className="space-y-1">
                <div className="flex items-baseline gap-3">
                  <span className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                    {plan.name}
                  </span>
                  <span className={`font-bh-mono text-[11px] ${accentText}`}>
                    {plan.price}
                  </span>
                </div>
                <p className="text-xs text-bh-fg-3">{plan.description}</p>
              </div>
              <span
                className={`shrink-0 text-[12px] font-medium ${accentText} transition-transform group-hover:translate-x-1`}
              >
                {plan.cta} →
              </span>
            </Link>
          );
        })}
      </div>

      <div className="pt-2">
        <Link
          href="/onboarding/start"
          className="text-[13px] text-bh-fg-3 underline-offset-4 transition-colors hover:text-bh-fg-1 hover:underline"
        >
          ← Volver
        </Link>
      </div>
    </main>
  );
}
