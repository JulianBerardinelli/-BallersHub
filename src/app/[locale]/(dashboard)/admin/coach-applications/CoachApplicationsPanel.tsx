"use client";

import * as React from "react";
import { Button, Textarea, Chip } from "@heroui/react";
import { staffRolesSummary, staffRoleLabel, isStaffRole, type StaffRoleType } from "@/lib/staff/roles";

type Proposal = {
  id: string;
  club: string | null;
  role_title: string | null;
  roles: string[] | null;
  division: string | null;
  start_year: number | null;
  end_year: number | null;
  status: string | null;
};

type License = { title?: string; issuer?: string | null; year?: number | null };

export type CoachApp = {
  id: string;
  user_id: string;
  full_name: string | null;
  role_title: string | null;
  primary_role: string | null;
  secondary_roles: string[] | null;
  nationality: string[] | null;
  birth_date: string | null;
  current_club: string | null;
  proposed_team_name: string | null;
  transfermarkt_url: string | null;
  external_profile_url: string | null;
  status: string | null;
  rejection_reason: string | null;
  created_at: string | null;
  id_doc_url: string | null;
  selfie_url: string | null;
  licenses_draft: License[] | null;
  coach_career_item_proposals: Proposal[] | null;
  // slug del coach_profile resultante (presente en solicitudes aprobadas) →
  // permite linkear al perfil público.
  slug: string | null;
};

function fmtYears(p: Proposal) {
  const a = p.start_year ?? "";
  const b = p.end_year ?? "actual";
  return a || p.end_year ? `${a} – ${b}` : "";
}

export default function CoachApplicationsPanel({ initialItems }: { initialItems: CoachApp[] }) {
  const [items, setItems] = React.useState<CoachApp[]>(initialItems);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [reasons, setReasons] = React.useState<Record<string, string>>({});
  const [showReject, setShowReject] = React.useState<Record<string, boolean>>({});
  const [error, setError] = React.useState<string | null>(null);

  const pending = items.filter((a) => (a.status ?? "pending") === "pending");
  const history = items.filter((a) => (a.status ?? "pending") !== "pending");

  async function approve(id: string) {
    setError(null);
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/coach-applications/${id}/approve`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setItems((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: "approved", slug: data?.slug ?? a.slug } : a,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al aprobar");
    } finally {
      setBusy(null);
    }
  }

  async function reject(id: string) {
    setError(null);
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/coach-applications/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejection_reason: reasons[id] ?? "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setItems((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: "rejected", rejection_reason: reasons[id] ?? null } : a,
        ),
      );
      setShowReject((p) => ({ ...p, [id]: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al rechazar");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <header>
        <h1 className="font-bh-display text-2xl font-bold uppercase tracking-[-0.01em] text-bh-fg-1">
          Solicitudes de Staff
        </h1>
        <p className="mt-1 text-sm text-bh-fg-3">
          {pending.length} pendiente{pending.length === 1 ? "" : "s"} de revisión.
        </p>
      </header>

      {error && (
        <div className="rounded-bh-md border border-bh-danger/30 bg-bh-danger/10 p-3 text-sm text-bh-danger">
          {error}
        </div>
      )}

      {pending.length === 0 ? (
        <p className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-3">
          No hay solicitudes pendientes.
        </p>
      ) : (
        <div className="space-y-5">
          {pending.map((app) => (
            <article
              key={app.id}
              className="grid gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bh-display text-lg font-bold text-bh-fg-1">
                    {app.full_name || "(sin nombre)"}
                  </h2>
                  <p className="text-sm text-bh-fg-3">
                    {staffRolesSummary(
                      app.primary_role as StaffRoleType | null,
                      app.secondary_roles as StaffRoleType[] | null,
                    ) ||
                      app.role_title ||
                      "DT"}
                    {app.current_club ? ` · ${app.current_club}` : ""}
                    {app.proposed_team_name && !app.current_club ? ` · ${app.proposed_team_name} (propuesto)` : ""}
                  </p>
                  {app.primary_role && app.role_title && (
                    <p className="text-xs text-bh-fg-4">Cargo declarado: {app.role_title}</p>
                  )}
                  <p className="mt-1 text-xs text-bh-fg-4">
                    {(app.nationality ?? []).join(", ")}
                    {app.birth_date ? ` · ${app.birth_date}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {app.id_doc_url && (
                    <a
                      href={app.id_doc_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-bh-md border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs text-bh-fg-2 hover:border-white/[0.24] hover:text-bh-fg-1"
                    >
                      Documento
                    </a>
                  )}
                  {app.selfie_url && (
                    <a
                      href={app.selfie_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-bh-md border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs text-bh-fg-2 hover:border-white/[0.24] hover:text-bh-fg-1"
                    >
                      Selfie
                    </a>
                  )}
                </div>
              </div>

              {/* Trayectoria propuesta */}
              {(app.coach_career_item_proposals ?? []).length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-bh-fg-4">
                    Trayectoria
                  </h3>
                  <ul className="space-y-1 text-sm text-bh-fg-2">
                    {(app.coach_career_item_proposals ?? []).map((p) => (
                      <li key={p.id} className="flex flex-wrap gap-x-2">
                        <span className="font-medium text-bh-fg-1">{p.club}</span>
                        {(p.roles ?? []).length > 0 && (
                          <span className="text-bh-fg-3">
                            · {(p.roles ?? []).filter(isStaffRole).map((r) => staffRoleLabel(r)).join(", ")}
                          </span>
                        )}
                        {p.role_title && <span className="text-bh-fg-4">· {p.role_title}</span>}
                        {p.division && <span className="text-bh-fg-4">· {p.division}</span>}
                        {fmtYears(p) && <span className="text-bh-fg-4">· {fmtYears(p)}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Licencias declaradas */}
              {(app.licenses_draft ?? []).length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-bh-fg-4">
                    Licencias declaradas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(app.licenses_draft ?? []).map((l, i) => (
                      <Chip key={i} size="sm" variant="flat" className="bg-white/[0.06] text-bh-fg-2">
                        {l.title}
                        {l.issuer ? ` · ${l.issuer}` : ""}
                        {l.year ? ` · ${l.year}` : ""}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {(app.transfermarkt_url || app.external_profile_url) && (
                <div className="flex flex-wrap gap-3 text-xs">
                  {app.transfermarkt_url && (
                    <a href={app.transfermarkt_url} target="_blank" rel="noreferrer" className="text-bh-lime hover:underline">
                      Transfermarkt
                    </a>
                  )}
                  {app.external_profile_url && (
                    <a href={app.external_profile_url} target="_blank" rel="noreferrer" className="text-bh-lime hover:underline">
                      Perfil externo
                    </a>
                  )}
                </div>
              )}

              {/* Acciones */}
              <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
                <Button
                  onPress={() => approve(app.id)}
                  isLoading={busy === app.id}
                  isDisabled={busy === app.id}
                  className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]"
                >
                  Aprobar
                </Button>
                <Button
                  variant="flat"
                  onPress={() => setShowReject((p) => ({ ...p, [app.id]: !p[app.id] }))}
                  isDisabled={busy === app.id}
                  className="rounded-bh-md border border-white/[0.12] bg-transparent px-5 py-2 text-[13px] font-medium text-bh-fg-2 hover:border-bh-danger hover:text-bh-danger"
                >
                  Rechazar
                </Button>
              </div>

              {showReject[app.id] && (
                <div className="grid gap-2 rounded-bh-md border border-white/[0.06] bg-transparent p-3">
                  <Textarea
                    value={reasons[app.id] ?? ""}
                    onValueChange={(v) => setReasons((p) => ({ ...p, [app.id]: v }))}
                    minRows={2}
                    placeholder="Motivo del rechazo (se le muestra al DT). Opcional."
                    classNames={{ inputWrapper: "bg-bh-surface-2 border border-white/[0.08]" }}
                  />
                  <div className="flex justify-end">
                    <Button
                      onPress={() => reject(app.id)}
                      isLoading={busy === app.id}
                      isDisabled={busy === app.id}
                      className="rounded-bh-md bg-bh-danger px-4 py-1.5 text-[13px] font-semibold text-white"
                    >
                      Confirmar rechazo
                    </Button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Historial */}
      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bh-fg-4">Historial</h2>
          <ul className="divide-y divide-white/[0.06] rounded-bh-lg border border-white/[0.08] bg-bh-surface-1">
            {history.map((app) => (
              <li key={app.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-bh-fg-2">
                  {app.full_name || "(sin nombre)"}{" "}
                  <span className="text-bh-fg-4">· {app.role_title || "DT"}</span>
                </span>
                <span className="flex items-center gap-2">
                  {app.status === "rejected" && app.rejection_reason && (
                    <span className="text-xs text-bh-fg-4">“{app.rejection_reason}”</span>
                  )}
                  {app.status === "approved" && app.slug && (
                    <a
                      href={`/staff/${app.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-bh-lime hover:underline"
                    >
                      Ver perfil público ↗
                    </a>
                  )}
                  <Chip
                    size="sm"
                    variant="flat"
                    className={
                      app.status === "approved"
                        ? "bg-[rgba(34,197,94,0.12)] text-bh-success"
                        : "bg-bh-danger/10 text-bh-danger"
                    }
                  >
                    {app.status}
                  </Chip>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
