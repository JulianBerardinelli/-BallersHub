// src/components/layout/searchbar/ResultsTable.tsx
"use client";

import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Avatar, Skeleton,
} from "@heroui/react";
import type { PlayerHit } from "./usePlayerSearch";
import { formatMarketValueEUR } from "@/lib/format";
import VerifiedBadge from "@/components/icons/VerifiedBadge";
import TeamCrest from "@/components/team/TeamCrest";

/** % por columna (suma 100%) para evitar overflow */
const COLS = {
  player: "w-[44%] max-w-0",
  club:   "w-[29%] max-w-0",
  value:  "w-[13%]",
  reviews:"w-[14%]",
};

function planAvatarProps(plan: PlayerHit["plan"]) {
  if (plan === "pro")      return { isBordered: true as const, color: "primary" as const, title: "Pro" };
  if (plan === "pro_plus") return { isBordered: true as const, color: "warning" as const, title: "Pro+" };
  return { isBordered: false as const };
}

export default function ResultsTable({
  results, query, loading, onSelect, onHoverSlug,
}: {
  results: PlayerHit[];
  query: string;
  loading: boolean;
  onSelect: (hit: PlayerHit) => void;
  onHoverSlug?: (slug: string) => void;
}) {
  const emptyMsg =
    loading ? "Searching…"
    : query.trim().length > 0 ? "No results found."
    : "Type to search players…";

  return (
    <Table
      removeWrapper
      aria-label="Search results"
      classNames={{ table: "table-fixed w-full" }}
    >
      <TableHeader>
        <TableColumn className={COLS.player}>Player</TableColumn>
        <TableColumn className={COLS.club}>Club</TableColumn>
        <TableColumn className={`${COLS.value} text-right`}>Value</TableColumn>
        <TableColumn className={`${COLS.reviews} text-right`}>Reviews</TableColumn>
      </TableHeader>

      <TableBody emptyContent={emptyMsg}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={`s-${i}`}>
                <TableCell className={COLS.player}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex flex-col gap-2 min-w-0">
                      <Skeleton className="h-4 w-48 rounded-md" />
                      <Skeleton className="h-3 w-24 rounded-md" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className={COLS.club}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Skeleton className="h-5 w-5 rounded-[3px]" />
                    <Skeleton className="h-4 w-44 rounded-md" />
                  </div>
                </TableCell>
                <TableCell className={COLS.value}>
                  <div className="flex justify-end">
                    <Skeleton className="h-4 w-16 rounded-md" />
                  </div>
                </TableCell>
                <TableCell className={COLS.reviews}>
                  <div className="flex justify-end gap-3">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-4 w-8 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))
          : results.map((r) => {
              const primaryPos = r.positions?.[0] ?? "-";
              const avatarP = planAvatarProps(r.plan);

              return (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => onSelect(r)}
                  onMouseEnter={() => onHoverSlug?.(r.slug)}
                >
                  {/* Player */}
                  <TableCell className={COLS.player}>
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        size="md"
                        radius="full"
                        src={r.avatarUrl ?? undefined}
                        name={r.name?.[0] ?? "?"}
                        {...avatarP}
                      />
                      <div className="leading-tight min-w-0">
                        <div className="font-medium truncate flex items-center gap-1">
                          {r.name}
                          {(r.plan === "pro" || r.plan === "pro_plus") && (
                            <VerifiedBadge
                              variant={r.plan}
                              size={16}
                              className="shrink-0"
                              title={r.plan === "pro" ? "Pro" : "Pro+"}
                            />
                          )}
                        </div>
                        <div className="text-xs opacity-70">{primaryPos}</div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Club: crest + name */}
                  <TableCell className={COLS.club}>
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamCrest src={r.clubCrestUrl} size={28} />
                      <span className="truncate block">{r.club ?? "—"}</span>
                    </div>
                  </TableCell>

                  {/* Value */}
                  <TableCell className={COLS.value}>
                    <div className="text-right tabular-nums">
                      {formatMarketValueEUR(r.marketValueEur)}
                    </div>
                  </TableCell>

                  {/* Reviews */}
                  <TableCell className={COLS.reviews}>
                    <div className="text-right">
                      {r.plan === "free" ? (
                        <span
                          className="text-xs opacity-60 select-none"
                          aria-disabled="true"
                          title="Reviews are available on Pro plans"
                        >
                          Requires Pro plan
                        </span>
                      ) : (
                        <>
                          <span aria-label="rating" className="mr-2">☆☆☆☆☆</span>
                          <span className="text-xs opacity-70 align-middle">+0</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
      </TableBody>
    </Table>
  );
}
