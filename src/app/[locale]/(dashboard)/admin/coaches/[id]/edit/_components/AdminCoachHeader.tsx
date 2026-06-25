import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ExternalLink } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  approved: "Aprobado",
  pending_review: "Revisión",
  rejected: "Rechazado",
  draft: "Borrador",
};

type Props = {
  name: string;
  slug: string;
  avatarUrl: string | null;
  status: string;
  isPro: boolean;
};

const chip =
  "inline-flex items-center rounded-bh-pill border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]";

// Mirror of the player module's AdminPlayerHeader, pointed at /coach/[slug].
export default function AdminCoachHeader({ name, slug, avatarUrl, status, isPro }: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-bh-md border border-white/[0.08] bg-bh-surface-2">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={name} fill sizes="48px" className="object-cover" unoptimized />
          ) : (
            <div className="flex size-full items-center justify-center text-[10px] text-bh-fg-4">—</div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bh-display text-base font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
            {name || "Entrenador"}
          </p>
          <p className="truncate font-bh-mono text-[11px] text-bh-fg-4">/coach/{slug}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${chip} border-white/[0.12] bg-white/[0.06] text-bh-fg-2`}>
          {STATUS_LABELS[status] ?? status}
        </span>
        <span
          className={
            isPro
              ? `${chip} border-bh-blue/30 bg-bh-blue/10 text-bh-blue`
              : `${chip} border-white/[0.12] bg-white/[0.06] text-bh-fg-3`
          }
        >
          {isPro ? "Pro" : "Free"}
        </span>
        {slug ? (
          <Link
            href={`/staff/${slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-bh-md border border-white/[0.12] px-2.5 py-1 text-[11px] font-semibold text-bh-fg-2 transition-colors hover:bg-white/[0.06] hover:text-bh-fg-1"
          >
            <ExternalLink size={13} /> Ver público
          </Link>
        ) : null}
      </div>
    </div>
  );
}
