"use client";

import { Avatar } from "@heroui/react";
import VerifiedBadge from "@/components/icons/VerifiedBadge";
import { formatMarketValueEUR } from "@/lib/format";
import type { PlayerHit } from "../usePlayerSearch";

function planToAvatarColor(plan?: PlayerHit["plan"]) {
  if (plan === "pro") return "primary";
  if (plan === "pro_plus") return "secondary";
  return undefined;
}

export default function ResultsListMobile({
  results,
  query,
  loading,
  onSelect,
  onHoverSlug,
}: {
  results: PlayerHit[];
  query: string;
  loading: boolean;
  onSelect: (hit: PlayerHit) => void;
  onHoverSlug?: (slug: string) => void;
}) {
  const emptyMsg = loading
    ? "Searching…"
    : query.trim().length > 0
    ? "No results found."
    : "Type to search players…";

  if (loading) {
    return (
      <ul className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 rounded-md border border-content3/20 p-3">
            <div className="h-12 w-12 rounded-full bg-content3/50 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-content3/50 animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-content3/30 animate-pulse" />
            </div>
            <div className="h-4 w-14 rounded bg-content3/40 animate-pulse" />
          </li>
        ))}
      </ul>
    );
  }

  if (!results.length) {
    return <div className="text-sm opacity-70 py-6 text-center">{emptyMsg}</div>;
  }

  return (
    <ul className="divide-y divide-content3/20">
      {results.map((r) => {
        const primaryPos = r.positions?.[0] ?? "-";
        const avatarColor = planToAvatarColor(r.plan) as any;

        return (
          <li
            key={r.id}
            className="flex items-center gap-3 py-3 px-4 sm:px-4 cursor-pointer hover:bg-content2/40 rounded-lg"
            onClick={() => onSelect(r)}
            onMouseEnter={() => onHoverSlug?.(r.slug)}
          >
            <Avatar
              size="md"
              radius="full"
              isBordered={!!avatarColor}
              color={avatarColor}
              src={r.avatarUrl ?? undefined}
              name={r.name?.[0] ?? "?"}
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="truncate font-medium">{r.name}</p>
                {(r.plan === "pro" || r.plan === "pro_plus") && (
                  <VerifiedBadge
                    variant={r.plan}
                    size={16}
                    className="shrink-0"
                    title={r.plan === "pro" ? "Pro" : "Pro+"}
                  />
                )}
              </div>
              <p className="text-xs opacity-70 truncate">
                {primaryPos} • {r.club ?? "—"}
              </p>
            </div>

            <div className="text-right">
              <div className="text-sm tabular-nums">{formatMarketValueEUR(r.marketValueEur)}</div>
              {r.plan === "free" ? (
                <div className="text-[10px] opacity-60">Requires Pro plan</div>
              ) : (
                <div className="text-[10px] opacity-70">
                  <span aria-label="rating" className="mr-1">☆☆☆☆☆</span>
                  +0
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
