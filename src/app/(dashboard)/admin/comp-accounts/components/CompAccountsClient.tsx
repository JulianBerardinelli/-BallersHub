"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  Gift,
  Infinity as InfinityIcon,
  Loader2,
  Search,
  ShieldOff,
  X,
} from "lucide-react";
import { bhButtonClass } from "@/components/ui/BhButton";
import {
  grantProAccess,
  extendProAccess,
  makeProPermanent,
  revokeProAccess,
  searchUsersForGrant,
  type CompAccountRow,
} from "@/app/actions/admin-comp-accounts";

type SearchResultRow = {
  userId: string;
  email: string | null;
  fullName: string | null;
};

type Props = { initial: CompAccountRow[] };

export default function CompAccountsClient({ initial }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // ----------------- Grant form state -----------------
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<SearchResultRow | null>(null);
  const [planId, setPlanId] = useState<"pro-player" | "pro-agency">(
    "pro-player",
  );
  const [duration, setDuration] = useState<1 | 3 | 6 | 12 | null>(12);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // ----------------- Per-row action state --------------
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function runSearch() {
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await searchUsersForGrant({ query: searchQuery.trim() });
      if (res.ok) setSearchResults(res.data);
      else setFormError(res.error);
    } finally {
      setSearching(false);
    }
  }

  async function submitGrant() {
    if (!picked) {
      setFormError("Seleccioná un usuario primero");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      const res = await grantProAccess({
        targetUserId: picked.userId,
        planId,
        durationMonths: duration,
        reason: reason.trim() || undefined,
      });
      if (res.ok) {
        setFormSuccess(
          `Pro otorgado a ${picked.email ?? picked.userId.slice(0, 8)}`,
        );
        setPicked(null);
        setSearchQuery("");
        setSearchResults([]);
        setReason("");
        startTransition(() => router.refresh());
      } else {
        setFormError(res.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExtend(row: CompAccountRow, months: 1 | 3 | 6 | 12) {
    setRowBusy(row.subscriptionId);
    setRowError(null);
    try {
      const res = await extendProAccess({
        subscriptionId: row.subscriptionId,
        additionalMonths: months,
      });
      if (!res.ok) setRowError(res.error);
      else startTransition(() => router.refresh());
    } finally {
      setRowBusy(null);
    }
  }

  async function handleMakePermanent(row: CompAccountRow) {
    setRowBusy(row.subscriptionId);
    setRowError(null);
    try {
      const res = await makeProPermanent({ subscriptionId: row.subscriptionId });
      if (!res.ok) setRowError(res.error);
      else startTransition(() => router.refresh());
    } finally {
      setRowBusy(null);
    }
  }

  async function handleRevoke(row: CompAccountRow) {
    if (
      !window.confirm(
        `¿Revocar Pro de ${row.email ?? row.userId.slice(0, 8)}? El usuario vuelve a Free.`,
      )
    )
      return;
    setRowBusy(row.subscriptionId);
    setRowError(null);
    try {
      const res = await revokeProAccess({
        subscriptionId: row.subscriptionId,
      });
      if (!res.ok) setRowError(res.error);
      else startTransition(() => router.refresh());
    } finally {
      setRowBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* ============= GRANT FORM ============= */}
      <section className="space-y-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-bh-lime" />
          <h2 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
            Otorgar nuevo Pro
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* User search */}
          <div className="space-y-2">
            <label className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-bh-fg-3">
              Usuario destinatario
            </label>
            {picked ? (
              <div className="flex items-center justify-between gap-3 rounded-bh-md border border-bh-lime/30 bg-bh-lime/5 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-bh-fg-1">
                    {picked.fullName ?? picked.email ?? picked.userId.slice(0, 8)}
                  </p>
                  <p className="truncate font-bh-mono text-[11px] text-bh-fg-3">
                    {picked.email ?? picked.userId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(null);
                    setSearchResults([]);
                  }}
                  className="text-bh-fg-3 hover:text-bh-fg-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-bh-fg-4" />
                    <input
                      type="text"
                      placeholder="Email o nombre..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          runSearch();
                        }
                      }}
                      className="w-full rounded-bh-md border border-white/[0.08] bg-[#141414] py-2 pl-8 pr-2 text-[13px] text-bh-fg-1 placeholder:text-bh-fg-4 focus:border-bh-lime focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={runSearch}
                    disabled={searching || searchQuery.trim().length < 2}
                    className={bhButtonClass({ variant: "outline", size: "sm" })}
                  >
                    {searching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Buscar"
                    )}
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="max-h-48 space-y-1 overflow-auto rounded-bh-md border border-white/[0.08] bg-bh-surface-2 p-1">
                    {searchResults.map((r) => (
                      <button
                        key={r.userId}
                        type="button"
                        onClick={() => {
                          setPicked(r);
                          setSearchResults([]);
                        }}
                        className="flex w-full flex-col items-start gap-0.5 rounded-bh-md px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
                      >
                        <span className="text-[12.5px] font-semibold text-bh-fg-1">
                          {r.fullName ?? r.email ?? r.userId.slice(0, 8)}
                        </span>
                        <span className="font-bh-mono text-[11px] text-bh-fg-3">
                          {r.email ?? r.userId}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Plan + duration + reason */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-bh-fg-3">
                Plan
              </label>
              <div className="flex gap-2">
                {(["pro-player", "pro-agency"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlanId(p)}
                    className={`flex-1 rounded-bh-md border px-3 py-2 text-[12.5px] font-semibold transition-colors ${
                      planId === p
                        ? "border-bh-lime/40 bg-bh-lime/10 text-bh-lime"
                        : "border-white/[0.08] bg-[#141414] text-bh-fg-2 hover:border-white/[0.18]"
                    }`}
                  >
                    {p === "pro-player" ? "Pro Player" : "Pro Agency"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-bh-fg-3">
                Duración
              </label>
              <div className="flex flex-wrap gap-2">
                {([1, 3, 6, 12] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDuration(m)}
                    className={`rounded-bh-md border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      duration === m
                        ? "border-bh-lime/40 bg-bh-lime/10 text-bh-lime"
                        : "border-white/[0.08] bg-[#141414] text-bh-fg-2 hover:border-white/[0.18]"
                    }`}
                  >
                    {m}m
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDuration(null)}
                  className={`flex items-center gap-1 rounded-bh-md border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                    duration === null
                      ? "border-bh-lime/40 bg-bh-lime/10 text-bh-lime"
                      : "border-white/[0.08] bg-[#141414] text-bh-fg-2 hover:border-white/[0.18]"
                  }`}
                >
                  <InfinityIcon className="h-3.5 w-3.5" />
                  Permanente
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-bh-fg-3">
                Razón (opcional, queda en audit log)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
                placeholder="ej: amigo, partner, beta tester"
                className="w-full rounded-bh-md border border-white/[0.08] bg-[#141414] px-3 py-2 text-[13px] text-bh-fg-1 placeholder:text-bh-fg-4 focus:border-bh-lime focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          {formError ? (
            <p className="text-[12.5px] text-bh-danger">{formError}</p>
          ) : formSuccess ? (
            <p className="text-[12.5px] text-bh-lime">{formSuccess}</p>
          ) : (
            <span className="text-[11.5px] text-bh-fg-4">
              Sin cobro. Audit log se escribe automáticamente.
            </span>
          )}
          <button
            type="button"
            disabled={!picked || submitting}
            onClick={submitGrant}
            className={bhButtonClass({ variant: "lime", size: "sm" })}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Gift className="h-4 w-4" />
            )}
            Otorgar Pro
          </button>
        </div>
      </section>

      {/* ============= TABLE ============= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
            Cortesías otorgadas ({initial.length})
          </h2>
          {rowError && (
            <span className="text-[12.5px] text-bh-danger">{rowError}</span>
          )}
        </div>

        {initial.length === 0 ? (
          <div className="rounded-bh-lg border border-dashed border-white/[0.08] bg-bh-surface-1 p-8 text-center">
            <p className="text-[13px] text-bh-fg-3">
              Todavía no otorgaste ninguna cuenta de cortesía. Usá el form de
              arriba para empezar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-bh-lg border border-white/[0.08] bg-bh-surface-1">
            <table className="w-full text-left text-[12.5px]">
              <thead className="border-b border-white/[0.08] text-[10.5px] font-bold uppercase tracking-[0.12em] text-bh-fg-4">
                <tr>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Otorgado</th>
                  <th className="px-4 py-3">Vence</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {initial.map((row) => {
                  const busy = rowBusy === row.subscriptionId;
                  const isCanceled = row.statusV2 === "canceled";
                  return (
                    <tr
                      key={row.subscriptionId}
                      className="border-b border-white/[0.04] last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="text-[12.5px] font-semibold text-bh-fg-1">
                          {row.fullName ?? row.email ?? row.userId.slice(0, 8)}
                        </div>
                        <div className="font-bh-mono text-[10.5px] text-bh-fg-4">
                          {row.email ?? row.userId.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-bh-fg-2">
                        {row.planId === "pro-agency"
                          ? "Pro Agency"
                          : "Pro Player"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={row.statusV2} />
                      </td>
                      <td className="px-4 py-3 text-bh-fg-3">
                        {formatDate(row.grantedAt)}
                      </td>
                      <td className="px-4 py-3 text-bh-fg-3">
                        {row.currentPeriodEnd ? (
                          formatDate(row.currentPeriodEnd)
                        ) : isCanceled ? (
                          "—"
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-bh-pill border border-bh-lime/30 bg-bh-lime/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-bh-lime">
                            <InfinityIcon className="h-3 w-3" />
                            Permanente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isCanceled && (
                            <>
                              {([1, 3, 6, 12] as const).map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleExtend(row, m)}
                                  className={bhButtonClass({
                                    variant: "outline",
                                    size: "xs",
                                  })}
                                  title={`Extender +${m} meses`}
                                >
                                  +{m}m
                                </button>
                              ))}
                              {row.currentPeriodEnd && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleMakePermanent(row)}
                                  className={bhButtonClass({
                                    variant: "outline",
                                    size: "xs",
                                  })}
                                  title="Hacer permanente"
                                >
                                  <CalendarPlus className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleRevoke(row)}
                                className={bhButtonClass({
                                  variant: "danger-soft",
                                  size: "xs",
                                })}
                                title="Revocar"
                              >
                                {busy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <ShieldOff className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </>
                          )}
                          {isCanceled && (
                            <span className="text-[11px] text-bh-fg-4">
                              Revocada {row.canceledAt && formatDate(row.canceledAt)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: {
      label: "Activa",
      cls: "border-bh-lime/30 bg-bh-lime/10 text-bh-lime",
    },
    trialing: {
      label: "Trial",
      cls: "border-bh-blue/30 bg-bh-blue/10 text-bh-blue",
    },
    canceled: {
      label: "Cancelada",
      cls: "border-bh-danger/30 bg-bh-danger/10 text-bh-danger",
    },
  };
  const cfg = map[status ?? ""] ?? {
    label: status ?? "—",
    cls: "border-white/10 bg-white/5 text-bh-fg-3",
  };
  return (
    <span
      className={`inline-flex items-center rounded-bh-pill border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}
