// Isolated coach (DT) dashboard shell. Rendered by DashboardLayout via an early
// branch when the user is a coach, so the player/agency code path stays exactly
// as it was (zero regression surface). Mirrors the player shell's structure but
// reads coach_* data and wires the coach onboarding notification (incl. the
// rejection reason — coach_applications has rejection_reason, unlike players).

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/actions/auth";
import ClientDashboardSidebar from "@/components/dashboard/client/Sidebar";
import { DashboardDock } from "@/components/layout/mobile-nav";
import { COACH_NAVIGATION } from "./navigation";
import { NotificationBootstrap } from "@/modules/notifications";
import { PlanAccessProvider } from "@/components/dashboard/plan/PlanAccessProvider";
import SubscriptionStateBanner from "@/components/dashboard/plan/SubscriptionStateBanner";
import CoachProUpsell from "@/components/dashboard/plan/CoachProUpsell";
import { resolvePlanAccess } from "@/lib/dashboard/plan-access";
import type { DashboardSubscription } from "@/lib/dashboard/client/data-provider";

export type CoachShellProfile = {
  slug: string;
  fullName: string;
  avatarUrl: string | null;
  status: string;
  visibility: string;
};

export type CoachShellApplication = {
  id: string;
  status: string | null;
  rejectionReason: string | null;
};

export type CoachShellAdminEdit = {
  id: string;
  sectionLabel: string;
  note: string;
  detailsHref?: string | null;
};

export default function CoachDashboardShell({
  userEmail,
  profile,
  application,
  subscription,
  adminEdits,
  children,
}: {
  userEmail: string | null;
  profile: CoachShellProfile | null;
  application: CoachShellApplication | null;
  subscription: DashboardSubscription | null;
  adminEdits?: CoachShellAdminEdit[] | null;
  children: ReactNode;
}) {
  const planAccess = resolvePlanAccess(subscription ?? null);
  const userDisplayName = profile?.fullName ?? userEmail ?? null;
  const status = (application?.status ?? "").toLowerCase();
  const isPending = !profile && (status === "pending" || status === "pending_review" || status === "in_review");
  const isRejected = !profile && status === "rejected";

  return (
    <PlanAccessProvider value={{ access: planAccess, audience: "coach" }}>
      <NotificationBootstrap
        userName={userDisplayName}
        onboarding={
          application?.id
            ? {
                requestId: application.id,
                status: application.status ?? null,
                dashboardHref: "/dashboard",
                retryHref: "/onboarding/coach/apply",
                moderatorMessage: application.rejectionReason ?? undefined,
              }
            : null
        }
        coachAdminEdits={adminEdits ?? undefined}
      />
      <div className="mx-auto w-full max-w-[1200px] px-6 py-7 max-lg:pb-32">
        <header className="space-y-5">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
              Entrenador
            </span>
            <h1 className="font-bh-display text-3xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
              Área del <span className="text-bh-lime">DT</span>
            </h1>
            <p className="text-sm leading-[1.55] text-bh-fg-3">
              Gestioná tu perfil de entrenador, tus ideas de juego y tu página pública.
            </p>
          </div>

          <div className="space-y-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-bh-md border border-white/[0.08] bg-bh-surface-2">
                  {profile ? (
                    <Image
                      src={profile.avatarUrl ?? "/images/coach-default.jpg"}
                      alt="Avatar del entrenador"
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[11px] text-bh-fg-4">
                      Sin perfil
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                    {profile?.fullName ?? "Perfil en validación"}
                  </p>
                  <p className="font-bh-mono text-[11px] text-bh-fg-4">
                    {profile?.slug ? (
                      <Link href={`/staff/${profile.slug}`} className="hover:text-bh-lime">
                        /coach/{profile.slug}
                      </Link>
                    ) : (
                      "Tu página pública se activa al aprobarse tu solicitud."
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bh-display text-[10px] font-bold uppercase tracking-[0.14em] text-bh-fg-4">
                  Sesión activa
                </p>
                <p className="font-bh-mono text-[12px] text-bh-fg-3">{userEmail}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {profile ? (
                <>
                  <SummaryBadge>Perfil: {profile.status}</SummaryBadge>
                  <SummaryBadge>Visibilidad: {profile.visibility}</SummaryBadge>
                </>
              ) : isPending ? (
                <SummaryBadge tone="warning">Tu solicitud está en revisión</SummaryBadge>
              ) : isRejected ? (
                <SummaryBadge tone="warning">Tu solicitud fue rechazada</SummaryBadge>
              ) : (
                <SummaryBadge tone="warning">Aún no completaste tu solicitud</SummaryBadge>
              )}
              <SummaryBadge>Plan: {(subscription?.plan ?? "free").toUpperCase()}</SummaryBadge>
            </div>

            {isRejected && application?.rejectionReason && (
              <p className="rounded-bh-md border border-bh-warning/25 bg-bh-warning/5 p-3 text-[13px] text-bh-fg-2">
                <span className="font-semibold text-bh-warning">Motivo: </span>
                {application.rejectionReason}
              </p>
            )}
          </div>
        </header>

        <div className="mt-5 space-y-3">
          <SubscriptionStateBanner
            access={planAccess}
            rawSubscription={
              subscription
                ? {
                    plan: subscription.plan,
                    statusV2: subscription.statusV2,
                    currentPeriodEnd: subscription.currentPeriodEnd,
                  }
                : null
            }
          />
          {profile && !planAccess.isPro && <CoachProUpsell />}
        </div>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-[260px] lg:shrink-0">
            <div className="sticky top-24 hidden rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-3 lg:block">
              <ClientDashboardSidebar sections={COACH_NAVIGATION} onSignOut={signOutAction} />
            </div>
          </aside>
          <section className="min-w-0 flex-1 space-y-6">{children}</section>
        </div>
      </div>

      {/* Coach floating dock — Panel · Perfil · Ajustes (lg:hidden, portaled). */}
      <DashboardDock
        sections={COACH_NAVIGATION}
        isPro={planAccess.isPro}
        onSignOut={signOutAction}
      />
    </PlanAccessProvider>
  );
}

type SummaryBadgeTone = "default" | "warning" | "success";

function SummaryBadge({ children, tone = "default" }: { children: ReactNode; tone?: SummaryBadgeTone }) {
  const base =
    "inline-flex items-center rounded-bh-pill border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]";
  const tones: Record<SummaryBadgeTone, string> = {
    default: "border-white/[0.12] bg-white/[0.06] text-bh-fg-2",
    warning: "border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.10)] text-bh-warning",
    success: "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.10)] text-bh-success",
  };
  return <span className={`${base} ${tones[tone]}`}>{children}</span>;
}
