import type { EngagementTier } from "@/lib/marketing";

const STYLES: Record<EngagementTier, { label: string; cls: string; dot: string }> = {
  active: {
    label: "Active",
    cls: "border-[rgba(204,255,0,0.22)] bg-[rgba(204,255,0,0.10)] text-bh-lime",
    dot: "bg-bh-lime",
  },
  warm: {
    label: "Warm",
    cls: "border-[rgba(0,194,255,0.22)] bg-[rgba(0,194,255,0.10)] text-bh-blue",
    dot: "bg-bh-blue",
  },
  cold: {
    label: "Cold",
    cls: "border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.10)] text-bh-warning",
    dot: "bg-bh-warning",
  },
  dormant: {
    label: "Dormant",
    cls: "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.10)] text-bh-danger",
    dot: "bg-bh-danger",
  },
};

export default function EngagementTierChip({ tier }: { tier: EngagementTier }) {
  const cfg = STYLES[tier] ?? STYLES.active;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${cfg.cls}`}
    >
      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
