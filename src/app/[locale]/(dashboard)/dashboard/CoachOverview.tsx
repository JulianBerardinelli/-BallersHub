// CoachOverview — the body of the coach (DT) dashboard index (/dashboard).
// Rendered as the children of CoachDashboardShell via an early branch in
// dashboard/page.tsx. Without it, a coach landing on /dashboard would render
// the PLAYER empty-state ("completá tu perfil de jugador" / professional-account
// CTA) inside the coach shell. This is the coach "Panel de control": a status
// line + quick links to every coach editor.

import Link from "next/link";

export type CoachOverviewProfile = {
  slug: string;
  fullName: string;
  status: string;
  visibility: string;
} | null;

export type CoachOverviewApplication = {
  status: string | null;
  rejectionReason: string | null;
} | null;

const QUICK_ACTIONS: Array<{ href: string; title: string; desc: string; pro?: boolean }> = [
  {
    href: "/dashboard/coach/edit",
    title: "Datos del perfil",
    desc: "Bio, cargo, ideas de juego, formaciones y objetivos.",
  },
  {
    href: "/dashboard/coach/career",
    title: "Trayectoria",
    desc: "Clubes dirigidos y estadísticas por temporada (con revisión).",
  },
  {
    href: "/dashboard/coach/licenses",
    title: "Licencias",
    desc: "Titulaciones y certificaciones, verificadas por el equipo.",
  },
  {
    href: "/dashboard/coach/multimedia",
    title: "Multimedia",
    desc: "Fotos y videos de tu trabajo.",
  },
  {
    href: "/dashboard/coach/translations",
    title: "Idiomas",
    desc: "Publicá tu página en inglés, italiano y portugués.",
    pro: true,
  },
];

export default function CoachOverview({
  profile,
  application,
}: {
  profile: CoachOverviewProfile;
  application: CoachOverviewApplication;
}) {
  const status = (application?.status ?? "").toLowerCase();
  const isPending =
    !profile && (status === "pending" || status === "pending_review" || status === "in_review");
  const isRejected = !profile && status === "rejected";

  return (
    <div className="space-y-6">
      {/* Status / next-step banner */}
      {profile ? (
        <div className="flex flex-col gap-2 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bh-display text-sm font-bold uppercase tracking-[0.04em] text-bh-fg-1">
              Tu página pública está activa
            </p>
            <p className="mt-1 font-bh-mono text-[12px] text-bh-fg-3">/coach/{profile.slug}</p>
          </div>
          <Link
            href={`/staff/${profile.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center justify-center rounded-bh-pill bg-bh-lime px-4 py-2 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]"
          >
            Ver página pública ↗
          </Link>
        </div>
      ) : isPending ? (
        <div className="rounded-bh-lg border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] p-5">
          <p className="font-bh-display text-sm font-bold uppercase tracking-[0.04em] text-bh-warning">
            Tu solicitud está en revisión
          </p>
          <p className="mt-1.5 text-[13px] leading-[1.55] text-bh-fg-2">
            El equipo de &apos;BallersHub está validando tu perfil. Cuando se apruebe, tu página
            pública se activa y vas a poder editar todo desde acá.
          </p>
        </div>
      ) : isRejected ? (
        <div className="rounded-bh-lg border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] p-5">
          <p className="font-bh-display text-sm font-bold uppercase tracking-[0.04em] text-bh-warning">
            Tu solicitud fue rechazada
          </p>
          {application?.rejectionReason && (
            <p className="mt-1.5 text-[13px] leading-[1.55] text-bh-fg-2">
              <span className="font-semibold text-bh-warning">Motivo: </span>
              {application.rejectionReason}
            </p>
          )}
          <Link
            href="/onboarding/coach/apply"
            className="mt-3 inline-flex items-center justify-center rounded-bh-pill bg-bh-lime px-4 py-2 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]"
          >
            Volver a enviar
          </Link>
        </div>
      ) : (
        <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
          <p className="font-bh-display text-sm font-bold uppercase tracking-[0.04em] text-bh-fg-1">
            Completá tu solicitud de entrenador
          </p>
          <p className="mt-1.5 text-[13px] leading-[1.55] text-bh-fg-2">
            Cargá tu identidad, trayectoria y licencias para que el equipo valide tu perfil.
          </p>
          <Link
            href="/onboarding/coach/apply"
            className="mt-3 inline-flex items-center justify-center rounded-bh-pill bg-bh-lime px-4 py-2 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]"
          >
            Continuar solicitud
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 font-bh-display text-xs font-bold uppercase tracking-[0.12em] text-bh-fg-4">
          Gestioná tu perfil
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex flex-col gap-1 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-4 transition-colors hover:border-bh-lime/40"
            >
              <span className="flex items-center gap-2">
                <span className="font-bh-display text-sm font-bold uppercase tracking-[0.02em] text-bh-fg-1 group-hover:text-bh-lime">
                  {action.title}
                </span>
                {action.pro && (
                  <span className="rounded-bh-pill border border-bh-lime/40 bg-bh-lime/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-bh-lime">
                    Pro
                  </span>
                )}
              </span>
              <span className="text-[12px] leading-[1.5] text-bh-fg-3">{action.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
