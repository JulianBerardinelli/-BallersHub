// src/components/layout/searchbar/mobile/ResultsListMobile.tsx
"use client";

import { Avatar } from "@heroui/react";
import { Briefcase, MapPin } from "lucide-react";
import VerifiedBadge from "@/components/icons/VerifiedBadge";
import { formatMarketValueEUR } from "@/lib/format";
import type {
  AgencyHit,
  ManagerHit,
  PlayerHit,
  SearchHit,
  SearchResults,
} from "../usePlayerSearch";
import TeamCrest from "@/components/teams/TeamCrest";

function planToAvatarColor(plan?: PlayerHit["plan"]) {
  if (plan === "pro") return "primary";
  if (plan === "pro_plus") return "secondary";
  return undefined;
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 pt-3 pb-1.5">
      <span className="font-bh-display text-[10px] font-bold uppercase tracking-[0.1em] text-bh-fg-4">
        {label}
      </span>
      <span className="text-[10px] font-bh-mono text-bh-fg-4 opacity-70">
        {count}
      </span>
      <span className="ml-1 h-px flex-1 bg-content3/20" />
    </div>
  );
}

function PlayerRow({
  r, onSelect, onHoverHit,
}: {
  r: PlayerHit;
  onSelect: (hit: SearchHit) => void;
  onHoverHit?: (hit: SearchHit) => void;
}) {
  const primaryPos = r.positions?.[0] ?? "-";
  const avatarColor = planToAvatarColor(r.plan) as any;
  return (
    <li
      className="flex items-center gap-3 py-3 px-4 cursor-pointer hover:bg-content2/40 rounded-lg"
      onClick={() => onSelect(r)}
      onMouseEnter={() => onHoverHit?.(r)}
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
        <p className="text-xs opacity-70 truncate flex items-center gap-2">
          <TeamCrest src={r.clubCrestUrl} size={14} />
          <span className="truncate">{primaryPos} • {r.club ?? "—"}</span>
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
}

function AgencyRow({
  r, onSelect, onHoverHit,
}: {
  r: AgencyHit;
  onSelect: (hit: SearchHit) => void;
  onHoverHit?: (hit: SearchHit) => void;
}) {
  return (
    <li
      className="flex items-center gap-3 py-3 px-4 cursor-pointer hover:bg-content2/40 rounded-lg"
      onClick={() => onSelect(r)}
      onMouseEnter={() => onHoverHit?.(r)}
    >
      <Avatar
        size="md"
        radius="md"
        src={r.logoUrl ?? undefined}
        name={r.name?.[0] ?? "?"}
        className="shrink-0"
        fallback={<Briefcase className="size-5 text-bh-fg-3" />}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{r.name}</p>
        <p className="text-xs opacity-70 truncate flex items-center gap-2">
          <MapPin className="size-3.5 shrink-0 text-bh-fg-3" />
          <span className="truncate">{r.headquarters ?? "Agencia"}</span>
        </p>
      </div>
      <div className="text-right text-[10px] opacity-70 leading-tight">
        {r.operativeCountries && r.operativeCountries.length > 0 && (
          <div>{r.operativeCountries.length} países</div>
        )}
        {r.services && r.services.length > 0 && (
          <div>{r.services.length} servicios</div>
        )}
      </div>
    </li>
  );
}

function ManagerRow({
  r, onSelect, onHoverHit,
}: {
  r: ManagerHit;
  onSelect: (hit: SearchHit) => void;
  onHoverHit?: (hit: SearchHit) => void;
}) {
  const clickable = !!r.agencySlug;
  return (
    <li
      className={
        "flex items-center gap-3 py-3 px-4 rounded-lg " +
        (clickable ? "cursor-pointer hover:bg-content2/40" : "cursor-default")
      }
      onClick={() => clickable && onSelect(r)}
      onMouseEnter={() => onHoverHit?.(r)}
    >
      <Avatar
        size="md"
        radius="full"
        src={r.avatarUrl ?? undefined}
        name={r.name?.[0] ?? "?"}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{r.name}</p>
        <p className="text-xs opacity-70 truncate flex items-center gap-2">
          <Briefcase className="size-3.5 shrink-0 text-bh-fg-3" />
          <span className="truncate">{r.agencyName ?? "Manager"}</span>
        </p>
      </div>
      {r.contactEmail && (
        <div className="text-right text-[10px] opacity-70 max-w-[40%] truncate">
          {r.contactEmail}
        </div>
      )}
    </li>
  );
}

export default function ResultsListMobile({
  results,
  query,
  loading,
  onSelect,
  onHoverHit,
}: {
  results: SearchResults;
  query: string;
  loading: boolean;
  onSelect: (hit: SearchHit) => void;
  onHoverHit?: (hit: SearchHit) => void;
}) {
  if (loading) {
    return (
      <ul className="space-y-3 pt-3">
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

  const total =
    results.players.length + results.agencies.length + results.managers.length;

  if (total === 0) {
    const emptyMsg =
      query.trim().length > 0
        ? "No results found."
        : "Type to search players, agencies, managers…";
    return <div className="text-sm opacity-70 py-6 text-center">{emptyMsg}</div>;
  }

  return (
    <div className="flex flex-col">
      {results.players.length > 0 && (
        <section>
          <SectionHeader label="Jugadores" count={results.players.length} />
          <ul className="divide-y divide-content3/20">
            {results.players.map((r) => (
              <PlayerRow
                key={r.id}
                r={r}
                onSelect={onSelect}
                onHoverHit={onHoverHit}
              />
            ))}
          </ul>
        </section>
      )}

      {results.agencies.length > 0 && (
        <section>
          <SectionHeader label="Agencias" count={results.agencies.length} />
          <ul className="divide-y divide-content3/20">
            {results.agencies.map((r) => (
              <AgencyRow
                key={r.id}
                r={r}
                onSelect={onSelect}
                onHoverHit={onHoverHit}
              />
            ))}
          </ul>
        </section>
      )}

      {results.managers.length > 0 && (
        <section>
          <SectionHeader label="Managers / Agentes" count={results.managers.length} />
          <ul className="divide-y divide-content3/20">
            {results.managers.map((r) => (
              <ManagerRow
                key={r.id}
                r={r}
                onSelect={onSelect}
                onHoverHit={onHoverHit}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
