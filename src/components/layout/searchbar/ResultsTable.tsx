// src/components/layout/searchbar/ResultsTable.tsx
"use client";

import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Avatar, Skeleton,
} from "@heroui/react";
import { Briefcase, MapPin } from "lucide-react";
import type {
  AgencyHit,
  ManagerHit,
  PlayerHit,
  SearchHit,
  SearchResults,
} from "./usePlayerSearch";
import { formatMarketValueEUR } from "@/lib/format";
import VerifiedBadge from "@/components/icons/VerifiedBadge";
import TeamCrest from "@/components/teams/TeamCrest";

/** % por columna (suma 100%) para evitar overflow */
const COLS = {
  player: "w-[44%] max-w-0",
  club:   "w-[29%] max-w-0",
  value:  "w-[13%]",
  reviews:"w-[14%]",
};

const TABLE_CLASSES = {
  table: "table-fixed w-full",
  thead:
    "[&_th]:bg-transparent [&_th]:font-bh-display [&_th]:text-[10px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[0.1em] [&_th]:text-bh-fg-4 [&_th]:border-b [&_th]:border-white/[0.05]",
  tr: "data-[hover=true]:bg-white/[0.04] border-b border-white/[0.04]",
  td: "text-bh-fg-2",
  emptyWrapper: "text-bh-fg-3",
} as const;

function planAvatarProps(plan: PlayerHit["plan"]) {
  if (plan === "pro")      return { isBordered: true as const, color: "primary" as const, title: "Pro" };
  if (plan === "pro_plus") return { isBordered: true as const, color: "warning" as const, title: "Pro+" };
  return { isBordered: false as const };
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-4 pb-1.5">
      <span className="font-bh-display text-[10px] font-bold uppercase tracking-[0.1em] text-bh-fg-4">
        {label}
      </span>
      <span className="text-[10px] font-bh-mono text-bh-fg-4 opacity-70">
        {count}
      </span>
      <span className="ml-1 h-px flex-1 bg-white/[0.05]" />
    </div>
  );
}

function PlayersSection({
  rows, onSelect, onHoverHit,
}: {
  rows: PlayerHit[];
  onSelect: (hit: SearchHit) => void;
  onHoverHit?: (hit: SearchHit) => void;
}) {
  return (
    <Table removeWrapper aria-label="Jugadores" classNames={TABLE_CLASSES}>
      <TableHeader>
        <TableColumn className={COLS.player}>Jugador</TableColumn>
        <TableColumn className={COLS.club}>Club</TableColumn>
        <TableColumn className={`${COLS.value} text-right`}>Valor</TableColumn>
        <TableColumn className={`${COLS.reviews} text-right`}>Reviews</TableColumn>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const primaryPos = r.positions?.[0] ?? "-";
          const avatarP = planAvatarProps(r.plan);
          return (
            <TableRow
              key={r.id}
              className="cursor-pointer"
              onClick={() => onSelect(r)}
              onMouseEnter={() => onHoverHit?.(r)}
            >
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

              <TableCell className={COLS.club}>
                <div className="flex items-center gap-2 min-w-0">
                  <TeamCrest src={r.clubCrestUrl} size={28} />
                  <span className="truncate block">{r.club ?? "—"}</span>
                </div>
              </TableCell>

              <TableCell className={COLS.value}>
                <div className="text-right tabular-nums">
                  {formatMarketValueEUR(r.marketValueEur)}
                </div>
              </TableCell>

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

function AgenciesSection({
  rows, onSelect, onHoverHit,
}: {
  rows: AgencyHit[];
  onSelect: (hit: SearchHit) => void;
  onHoverHit?: (hit: SearchHit) => void;
}) {
  return (
    <Table removeWrapper aria-label="Agencias" classNames={TABLE_CLASSES}>
      <TableHeader>
        <TableColumn className={COLS.player}>Agencia</TableColumn>
        <TableColumn className={COLS.club}>Sede</TableColumn>
        <TableColumn className={`${COLS.value} text-right`}>Países</TableColumn>
        <TableColumn className={`${COLS.reviews} text-right`}>Servicios</TableColumn>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const countries = r.operativeCountries?.length ?? 0;
          const services = r.services?.length ?? 0;
          return (
            <TableRow
              key={r.id}
              className="cursor-pointer"
              onClick={() => onSelect(r)}
              onMouseEnter={() => onHoverHit?.(r)}
            >
              <TableCell className={COLS.player}>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    size="md"
                    radius="md"
                    src={r.logoUrl ?? undefined}
                    name={r.name?.[0] ?? "?"}
                    fallback={<Briefcase className="size-5 text-bh-fg-3" />}
                  />
                  <div className="leading-tight min-w-0">
                    <div className="font-medium truncate">{r.name}</div>
                    <div className="text-xs opacity-70 truncate">Agencia</div>
                  </div>
                </div>
              </TableCell>

              <TableCell className={COLS.club}>
                <div className="flex items-center gap-2 min-w-0 text-bh-fg-2">
                  <MapPin className="size-4 shrink-0 text-bh-fg-3" />
                  <span className="truncate block">{r.headquarters ?? "—"}</span>
                </div>
              </TableCell>

              <TableCell className={COLS.value}>
                <div className="text-right tabular-nums">
                  {countries > 0 ? countries : "—"}
                </div>
              </TableCell>

              <TableCell className={COLS.reviews}>
                <div className="text-right text-xs opacity-70">
                  {services > 0 ? `${services} servicios` : "—"}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ManagersSection({
  rows, onSelect, onHoverHit,
}: {
  rows: ManagerHit[];
  onSelect: (hit: SearchHit) => void;
  onHoverHit?: (hit: SearchHit) => void;
}) {
  return (
    <Table removeWrapper aria-label="Managers" classNames={TABLE_CLASSES}>
      <TableHeader>
        <TableColumn className={COLS.player}>Manager / Agente</TableColumn>
        <TableColumn className={COLS.club}>Agencia</TableColumn>
        <TableColumn className={`${COLS.value} text-right`}> </TableColumn>
        <TableColumn className={`${COLS.reviews} text-right`}>Contacto</TableColumn>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const clickable = !!r.agencySlug;
          return (
            <TableRow
              key={r.id}
              className={clickable ? "cursor-pointer" : "cursor-default"}
              onClick={() => clickable && onSelect(r)}
              onMouseEnter={() => onHoverHit?.(r)}
            >
              <TableCell className={COLS.player}>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    size="md"
                    radius="full"
                    src={r.avatarUrl ?? undefined}
                    name={r.name?.[0] ?? "?"}
                  />
                  <div className="leading-tight min-w-0">
                    <div className="font-medium truncate">{r.name}</div>
                    <div className="text-xs opacity-70 truncate">Manager</div>
                  </div>
                </div>
              </TableCell>

              <TableCell className={COLS.club}>
                <div className="flex items-center gap-2 min-w-0">
                  <Briefcase className="size-4 shrink-0 text-bh-fg-3" />
                  <span className="truncate block">{r.agencyName ?? "—"}</span>
                </div>
              </TableCell>

              <TableCell className={COLS.value}>
                <div className="text-right tabular-nums">&nbsp;</div>
              </TableCell>

              <TableCell className={COLS.reviews}>
                <div className="text-right text-xs opacity-70 truncate">
                  {r.contactEmail ?? "—"}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function ResultsTable({
  results, query, loading, onSelect, onHoverHit,
}: {
  results: SearchResults;
  query: string;
  loading: boolean;
  onSelect: (hit: SearchHit) => void;
  onHoverHit?: (hit: SearchHit) => void;
}) {
  if (loading) {
    return (
      <Table removeWrapper aria-label="Search results" classNames={TABLE_CLASSES}>
        <TableHeader>
          <TableColumn className={COLS.player}>Jugador</TableColumn>
          <TableColumn className={COLS.club}>Club</TableColumn>
          <TableColumn className={`${COLS.value} text-right`}>Valor</TableColumn>
          <TableColumn className={`${COLS.reviews} text-right`}>Reviews</TableColumn>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
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
          ))}
        </TableBody>
      </Table>
    );
  }

  const total =
    results.players.length + results.agencies.length + results.managers.length;

  if (total === 0) {
    const emptyMsg =
      query.trim().length > 0
        ? "No results found."
        : "Type to search players, agencies, managers…";
    return (
      <div className="flex h-full items-center justify-center px-6 py-12 text-sm text-bh-fg-3">
        {emptyMsg}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {results.players.length > 0 && (
        <section>
          <SectionHeader label="Jugadores" count={results.players.length} />
          <PlayersSection
            rows={results.players}
            onSelect={onSelect}
            onHoverHit={onHoverHit}
          />
        </section>
      )}

      {results.agencies.length > 0 && (
        <section>
          <SectionHeader label="Agencias" count={results.agencies.length} />
          <AgenciesSection
            rows={results.agencies}
            onSelect={onSelect}
            onHoverHit={onHoverHit}
          />
        </section>
      )}

      {results.managers.length > 0 && (
        <section>
          <SectionHeader label="Managers / Agentes" count={results.managers.length} />
          <ManagersSection
            rows={results.managers}
            onSelect={onSelect}
            onHoverHit={onHoverHit}
          />
        </section>
      )}
    </div>
  );
}
