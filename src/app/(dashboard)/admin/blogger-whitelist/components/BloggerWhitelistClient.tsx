"use client";

// Client-side UI para /admin/blogger-whitelist. Mismo patrón que
// CompAccountsClient: search en typeahead, lista de bloggers actuales,
// per-row actions.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ExternalLink,
  Loader2,
  PenSquare,
  Search,
  ShieldOff,
  X,
} from "lucide-react";
import { bhButtonClass } from "@/components/ui/BhButton";
import {
  grantBloggerAccess,
  revokeBloggerAccess,
  searchUsersForBloggerGrant,
  type BloggerRow,
  type SearchResultRow,
} from "@/app/actions/admin-blogger-whitelist";

type Props = { initial: BloggerRow[] };

export default function BloggerWhitelistClient({ initial }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // ----------------- Grant form state -----------------
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<SearchResultRow | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // ----------------- Per-row action state --------------
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ userId: string; error: string } | null>(
    null,
  );

  const runSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await searchUsersForBloggerGrant({ query: q.trim() });
      if (res.ok) setSearchResults(res.data);
    } finally {
      setSearching(false);
    }
  };

  const handlePick = (row: SearchResultRow) => {
    setPicked(row);
    setSearchResults([]);
    setSearchQuery("");
    // Auto-fill displayName con el fullName o el local-part del email.
    setDisplayName(row.fullName ?? row.email?.split("@")[0] ?? "");
    setFormError(null);
    setFormSuccess(null);
  };

  const handleGrant = async () => {
    if (!picked) return;
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      const res = await grantBloggerAccess({
        targetUserId: picked.userId,
        displayName: displayName.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      if (res.ok) {
        setFormSuccess(
          `Whitelist OK. Author hub: /blog/authors/${res.data.hubSlug}`,
        );
        setPicked(null);
        setDisplayName("");
        setReason("");
        startTransition(() => router.refresh());
      } else {
        setFormError(res.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (row: BloggerRow) => {
    if (
      !window.confirm(
        `¿Revocar acceso de blogger para ${row.email ?? row.userId}?\n\nLos posts publicados y el author hub se preservan. Solo deja de poder escribir nuevos.`,
      )
    ) {
      return;
    }
    setRowBusy(row.userId);
    setRowError(null);
    try {
      const res = await revokeBloggerAccess({ targetUserId: row.userId });
      if (res.ok) {
        startTransition(() => router.refresh());
      } else {
        setRowError({ userId: row.userId, error: res.error });
      }
    } finally {
      setRowBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* ============ Grant form ============ */}
      <section className="rounded-bh-lg border border-bh-fg-4/40 bg-bh-surface-1 p-5 md:p-6">
        <h2 className="mb-4 font-bh-display text-lg font-bold uppercase tracking-tight text-bh-fg-1">
          Sumar nuevo blogger
        </h2>

        {!picked ? (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-bh-fg-2">
                Buscar usuario por email o nombre
              </span>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-bh-fg-3"
                  aria-hidden
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => runSearch(e.target.value)}
                  placeholder="ej. juan@example.com"
                  className="w-full rounded-bh-md border border-bh-fg-4 bg-bh-surface-2 py-2.5 pl-10 pr-3 text-sm text-bh-fg-1 focus:border-bh-lime focus:outline-none"
                />
                {searching && (
                  <Loader2
                    className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-bh-fg-3"
                    aria-hidden
                  />
                )}
              </div>
            </label>

            {searchResults.length > 0 && (
              <ul className="max-h-64 overflow-y-auto rounded-bh-md border border-bh-fg-4 bg-bh-surface-2">
                {searchResults.map((r) => (
                  <li key={r.userId}>
                    <button
                      type="button"
                      onClick={() => !r.alreadyBlogger && handlePick(r)}
                      disabled={r.alreadyBlogger}
                      className="flex w-full items-center justify-between gap-3 border-b border-bh-fg-4/40 px-3 py-2.5 text-left text-sm last:border-b-0 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-bh-surface-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-bh-fg-1">
                          {r.fullName ?? r.email ?? r.userId}
                        </div>
                        {r.fullName && r.email && (
                          <div className="truncate text-[11px] text-bh-fg-3">
                            {r.email}
                          </div>
                        )}
                      </div>
                      {r.alreadyBlogger && (
                        <span className="rounded-bh-pill border border-bh-lime/40 bg-bh-lime/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-bh-lime">
                          Ya es blogger
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {searchQuery.length >= 2 &&
              !searching &&
              searchResults.length === 0 && (
                <p className="text-[12px] text-bh-fg-3">
                  Sin resultados para &quot;{searchQuery}&quot;.
                </p>
              )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 rounded-bh-md border border-bh-lime/30 bg-bh-lime/5 p-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.1em] text-bh-fg-3">
                  Usuario seleccionado
                </div>
                <div className="mt-0.5 truncate text-sm font-medium text-bh-fg-1">
                  {picked.fullName ?? picked.email ?? picked.userId}
                </div>
                {picked.fullName && picked.email && (
                  <div className="truncate text-[11px] text-bh-fg-3">
                    {picked.email}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setPicked(null);
                  setDisplayName("");
                  setFormError(null);
                  setFormSuccess(null);
                }}
                className="rounded-bh-sm p-1 text-bh-fg-3 transition-colors hover:bg-bh-surface-3 hover:text-bh-fg-1"
                aria-label="Quitar selección"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-bh-fg-2">
                Display name (público en el blog)
              </span>
              <span className="mb-1 block text-[11px] text-bh-fg-3">
                Aparece como byline en posts y header del author hub. Default: fullname del user o local-part del email.
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ej. Lautaro Sample"
                className="w-full rounded-bh-md border border-bh-fg-4 bg-bh-surface-2 px-3 py-2.5 text-sm text-bh-fg-1 focus:border-bh-lime focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-bh-fg-2">
                Razón (opcional, queda en audit log)
              </span>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ej. invitado como columnista de mercado AR"
                className="w-full rounded-bh-md border border-bh-fg-4 bg-bh-surface-2 px-3 py-2.5 text-sm text-bh-fg-1 focus:border-bh-lime focus:outline-none"
              />
            </label>

            {formError && (
              <p className="text-sm font-semibold text-red-300">{formError}</p>
            )}
            {formSuccess && (
              <p className="text-sm font-semibold text-bh-lime">{formSuccess}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleGrant}
                disabled={submitting}
                className={bhButtonClass({ variant: "lime", size: "sm" })}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    <span>Aplicando…</span>
                  </>
                ) : (
                  <>
                    <Check className="size-4" aria-hidden />
                    <span>Hacer blogger</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ============ Bloggers list ============ */}
      <section>
        <h2 className="mb-3 font-bh-display text-lg font-bold uppercase tracking-tight text-bh-fg-1">
          Bloggers actuales ({initial.length})
        </h2>

        {initial.length === 0 ? (
          <div className="rounded-bh-lg border border-dashed border-bh-fg-4 bg-bh-surface-1 p-8 text-center">
            <p className="text-sm text-bh-fg-3">
              Todavía no hay bloggers whitelisted. Buscá un usuario arriba para
              empezar.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {initial.map((row) => (
              <li
                key={row.userId}
                className="rounded-bh-lg border border-bh-fg-4/40 bg-bh-surface-1 p-4 md:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-bh-fg-1">
                        {row.hubDisplayName ??
                          row.fullName ??
                          row.email ??
                          row.userId}
                      </span>
                      {row.hubSlug ? (
                        <a
                          href={`/blog/authors/${row.hubSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-bh-pill border border-bh-lime/40 bg-bh-lime/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-bh-lime transition-colors hover:bg-bh-lime/20"
                        >
                          /blog/authors/{row.hubSlug}
                          <ExternalLink className="size-3" aria-hidden />
                        </a>
                      ) : (
                        <span className="inline-flex items-center rounded-bh-pill border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-amber-300">
                          Sin author hub
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-bh-fg-3">
                      {row.email && <span>{row.email}</span>}
                      {row.hubHeadline && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{row.hubHeadline}</span>
                        </>
                      )}
                    </div>
                    {row.hubBio && (
                      <p className="mt-2 max-w-prose text-[12px] leading-[1.5] text-bh-fg-3">
                        {row.hubBio}
                      </p>
                    )}
                    {rowError?.userId === row.userId && (
                      <p className="mt-2 text-[12px] font-semibold text-red-300">
                        {rowError.error}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {row.hubSlug && (
                      <a
                        href={`/blog/authors/${row.hubSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-bh-sm border border-bh-fg-4 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-bh-fg-2 transition-colors hover:border-bh-fg-3 hover:text-bh-fg-1"
                      >
                        <PenSquare className="size-3" aria-hidden />
                        Ver hub
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRevoke(row)}
                      disabled={rowBusy === row.userId}
                      className="inline-flex items-center gap-1 rounded-bh-sm border border-red-500/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-red-300 transition-colors hover:border-red-400 hover:text-red-200 disabled:opacity-50"
                    >
                      {rowBusy === row.userId ? (
                        <>
                          <Loader2 className="size-3 animate-spin" aria-hidden />
                          <span>…</span>
                        </>
                      ) : (
                        <>
                          <ShieldOff className="size-3" aria-hidden />
                          <span>Revocar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
