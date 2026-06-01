// Helpers de UI compartidos entre las pages de /admin/seo.

import Link from "next/link";

export const SEO_NAV = [
  { href: "/admin/seo", label: "Overview" },
  { href: "/admin/seo/players", label: "Players (KPI)" },
  { href: "/admin/seo/queries", label: "Top queries" },
  { href: "/admin/seo/pages", label: "Top pages" },
];

export function SeoSubNav({ active }: { active: string }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-bh-fg-4/40 pb-3">
      {SEO_NAV.map((item) => {
        const isActive = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "rounded-bh-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors " +
              (isActive
                ? "bg-bh-lime/15 text-bh-lime"
                : "text-bh-fg-3 hover:bg-bh-fg-4/30 hover:text-bh-fg-1")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-bh-md border border-bh-fg-4/40 bg-bh-surface-1 p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-3">
        {label}
      </div>
      <div className="mt-1 font-bh-display text-2xl font-bold text-bh-fg-1">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-bh-fg-3">{hint}</div>}
    </div>
  );
}

export function ConfigErrorBanner({ error }: { error: string }) {
  return (
    <div className="rounded-bh-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
      <p className="font-semibold uppercase tracking-[0.08em] text-amber-300">
        Integración GSC no configurada
      </p>
      <p className="mt-2">{error}</p>
      <p className="mt-2 text-[12px] text-amber-200/80">
        Ver <code className="rounded bg-bh-surface-2 px-1.5 py-0.5">docs/seo/admin-seo-setup.md</code> para el paso a paso del Google Cloud Service Account.
      </p>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-bh-md border border-dashed border-bh-fg-4 bg-bh-surface-1 p-6 text-center text-sm text-bh-fg-3">
      {message}
    </div>
  );
}

// ----- Formatters -----

export const fmtNum = (n: number): string =>
  new Intl.NumberFormat("es-AR").format(Math.round(n));

export const fmtCtr = (ctr: number): string => `${(ctr * 100).toFixed(1)}%`;

export const fmtPosition = (pos: number): string =>
  pos === 0 ? "—" : pos.toFixed(1);

export const fmtDate = (iso: string | null): string => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
};
