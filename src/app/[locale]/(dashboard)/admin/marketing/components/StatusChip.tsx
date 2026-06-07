/** Visual status pill for marketing_campaigns.status values. */
export default function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${cfg.className}`}
    >
      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

const STATUS_STYLES: Record<string, { label: string; className: string; dot: string }> = {
  draft: {
    label: "Borrador",
    className: "border border-white/[0.12] bg-white/[0.04] text-bh-fg-2",
    dot: "bg-bh-fg-3",
  },
  scheduled: {
    label: "Agendada",
    className: "border border-[rgba(0,194,255,0.22)] bg-[rgba(0,194,255,0.10)] text-bh-blue",
    dot: "bg-bh-blue",
  },
  sending: {
    label: "Enviando",
    className: "border border-[rgba(204,255,0,0.22)] bg-[rgba(204,255,0,0.10)] text-bh-lime",
    dot: "bg-bh-lime animate-pulse",
  },
  sent: {
    label: "Enviada",
    className: "border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.10)] text-bh-success",
    dot: "bg-bh-success",
  },
  failed: {
    label: "Fallida",
    className: "border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.10)] text-bh-danger",
    dot: "bg-bh-danger",
  },
  paused: {
    label: "Pausada",
    className: "border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.10)] text-bh-warning",
    dot: "bg-bh-warning",
  },
};
