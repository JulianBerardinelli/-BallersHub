import Link from "next/link";

// Reusable "Historial" (resolved items) list for the coach moderation queues.
// Rendered by each queue's page below its pending panel — the panels stay
// focused on the live queue ("recibidas") and this shows the resolved history.

export type ModerationHistoryEntry = {
  id: string;
  primary: string;
  secondary?: string | null;
  status: "approved" | "rejected" | "cancelled" | string;
  reason?: string | null;
  slug?: string | null;
  at?: string | null;
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  approved: { label: "Aprobado", cls: "border-bh-success/25 bg-bh-success/10 text-bh-success" },
  rejected: { label: "Rechazado", cls: "border-bh-danger/25 bg-bh-danger/10 text-bh-danger" },
  cancelled: { label: "Cancelado", cls: "border-white/[0.12] bg-white/[0.06] text-bh-fg-3" },
};

function fmt(at?: string | null): string | null {
  if (!at) return null;
  try {
    return new Date(at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return null;
  }
}

export default function CoachModerationHistory({
  entries,
  title = "Historial",
}: {
  entries: ModerationHistoryEntry[];
  title?: string;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-bh-fg-4">{title}</h3>
      <ul className="divide-y divide-white/[0.06] rounded-bh-lg border border-white/[0.08] bg-bh-surface-1">
        {entries.map((e) => {
          const meta = STATUS_META[e.status] ?? { label: e.status, cls: "border-white/[0.12] bg-white/[0.06] text-bh-fg-3" };
          const date = fmt(e.at);
          return (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div className="min-w-0">
                <span className="font-medium text-bh-fg-1">{e.primary}</span>
                {e.secondary && <span className="text-bh-fg-4"> · {e.secondary}</span>}
                {e.slug && (
                  <Link
                    href={`/coach/${e.slug}`}
                    target="_blank"
                    className="ml-2 font-bh-mono text-[11px] text-bh-fg-4 hover:text-bh-lime"
                  >
                    /coach/{e.slug}
                  </Link>
                )}
                {e.status === "rejected" && e.reason && (
                  <p className="mt-0.5 text-[12px] text-bh-fg-4">“{e.reason}”</p>
                )}
              </div>
              <span className="flex items-center gap-2">
                {date && <span className="font-bh-mono text-[11px] text-bh-fg-4">{date}</span>}
                <span
                  className={`inline-flex items-center rounded-bh-pill border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${meta.cls}`}
                >
                  {meta.label}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
