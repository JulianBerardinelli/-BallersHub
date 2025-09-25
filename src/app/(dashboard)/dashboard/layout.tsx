import Image from "next/image";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";
import ClientDashboardSidebar from "@/components/dashboard/client/Sidebar";
import { clientDashboardNavigation } from "./navigation";

type PlayerSummary = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  slug: string | null;
  status: string;
  visibility: string;
  plan_public: string;
};

type SubscriptionSummary = {
  plan: string;
  status: string;
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard");

  const [{ data: profileRaw }, { data: subscriptionRaw }] = await Promise.all([
    supabase
      .from("player_profiles")
      .select("id, full_name, avatar_url, slug, status, visibility, plan_public")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const player = (profileRaw as PlayerSummary | null) ?? null;
  const sub = (subscriptionRaw as SubscriptionSummary | null) ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Área del cliente</h1>
          <p className="text-sm text-neutral-400">
            Gestioná tu perfil profesional, personalizá tu plantilla y administrá tu cuenta.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-950/60 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative size-16 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
                {player ? (
                  <Image
                    src={player.avatar_url ?? "/images/player-default.png"}
                    alt="Avatar del jugador"
                    fill
                    sizes="64px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-neutral-500">
                    Sin perfil
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  {player?.full_name ?? "Perfil sin configurar"}
                </p>
                <p className="text-xs text-neutral-500">
                  {player?.slug ? `/${player.slug}` : "Creá tu perfil para habilitar tu página pública."}
                </p>
              </div>
            </div>
            <div className="text-sm text-neutral-400">
              <p className="font-medium text-neutral-300">Sesión activa</p>
              <p>{user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {player ? (
              <>
                <SummaryBadge>Perfil: {player.status}</SummaryBadge>
                <SummaryBadge>Visibilidad: {player.visibility}</SummaryBadge>
              </>
            ) : (
              <SummaryBadge tone="warning">Aún no completaste tu perfil de jugador</SummaryBadge>
            )}
            <SummaryBadge>
              Plan: {(sub?.plan ?? player?.plan_public ?? "free").toUpperCase()}
            </SummaryBadge>
            {sub ? (
              <SummaryBadge tone={sub.status === "active" ? "success" : "warning"}>
                Estado plan: {sub.status}
              </SummaryBadge>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 lg:col-span-4 xl:col-span-3">
          <ClientDashboardSidebar sections={clientDashboardNavigation} onSignOut={signOutAction} />
        </aside>
        <section className="col-span-12 space-y-6 lg:col-span-8 xl:col-span-9">{children}</section>
      </div>
    </div>
  );
}

type SummaryBadgeTone = "default" | "warning" | "success";

function SummaryBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: SummaryBadgeTone;
}) {
  const baseClasses = "rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide";
  const toneClasses: Record<SummaryBadgeTone, string> = {
    default: "border-neutral-700 bg-neutral-900 text-neutral-200",
    warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  };

  return <span className={`${baseClasses} ${toneClasses[tone]}`}>{children}</span>;
}
