"use client";

import * as React from "react";
import {
  Button,
  Chip,
  Tooltip,
  User,
  Popover,
  PopoverTrigger,
  PopoverContent,
  CheckboxGroup,
  Checkbox,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  ChevronRight,
  Copy,
  ExternalLink,
  Filter,
  Globe,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import { bhChip } from "@/lib/ui/heroui-brand";
import AgencyAgentsList from "./components/AgencyAgentsList";
import type { AgencyRow, ColumnDef } from "./types";
import { columns } from "./columns";

type ChipTone = Parameters<typeof bhChip>[0];

type SortKey =
  | "name"
  | "is_approved"
  | "agent_count"
  | "player_count"
  | "headquarters"
  | "created_at";
type SortDir = "ascending" | "descending";

const DESKTOP_GRID =
  "grid-cols-[36px_minmax(0,1.7fr)_minmax(0,0.6fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_minmax(0,1fr)_minmax(0,0.75fr)_minmax(0,1fr)]";

function statusTone(isApproved: boolean): ChipTone {
  return isApproved ? "success" : "warning";
}
function statusLabel(isApproved: boolean) {
  return isApproved ? "Aprobada" : "Pendiente";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function alignClass(col: ColumnDef): string {
  if (col.align === "center") return "justify-center text-center";
  if (col.align === "end") return "justify-end text-right";
  return "justify-start text-left";
}

function HeaderCell({
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  col: ColumnDef;
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  if (!col.sortable) {
    return (
      <div
        className={`flex items-center gap-1 font-bh-display text-[10px] font-bold uppercase tracking-[0.1em] text-bh-fg-4 ${alignClass(
          col,
        )}`}
      >
        {col.name}
      </div>
    );
  }
  const active = sortKey === (col.uid as SortKey);
  const Icon = !active ? ArrowUpDown : sortDir === "ascending" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(col.uid as SortKey)}
      className={`flex items-center gap-1 font-bh-display text-[10px] font-bold uppercase tracking-[0.1em] transition-colors ${alignClass(
        col,
      )} ${active ? "text-bh-fg-1" : "text-bh-fg-4 hover:text-bh-fg-2"}`}
    >
      {col.name}
      <Icon size={10} />
    </button>
  );
}

function AgencyLogo({ src, name }: { src: string | null; name: string }) {
  if (src && src.trim() !== "") {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={`Logo de ${name}`}
        className="h-8 w-8 rounded-bh-md border border-white/[0.08] bg-bh-surface-2 object-contain"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-bh-md border border-white/[0.08] bg-bh-surface-2">
      <span className="font-bh-display text-[11px] font-bold uppercase text-bh-fg-3">
        {name.slice(0, 2)}
      </span>
    </div>
  );
}

export default function AgenciesTableUI({ items }: { items: AgencyRow[] }) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [copied, setCopied] = React.useState<string | null>(null);
  const [sortKey, setSortKey] = React.useState<SortKey | null>("created_at");
  const [sortDir, setSortDir] = React.useState<SortDir>("descending");
  const [filters, setFilters] = React.useState({
    status: new Set<"approved" | "pending">(),
    country: new Set<string>(),
  });

  const toggleExpand = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onSort = React.useCallback((key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((d) => (d === "ascending" ? "descending" : "ascending"));
        return key;
      }
      setSortDir("ascending");
      return key;
    });
  }, []);

  const copyId = React.useCallback((id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const allCountries = React.useMemo(
    () =>
      Array.from(
        new Set(items.flatMap((a) => a.operative_countries ?? [])),
      ).sort(),
    [items],
  );

  const filtered = React.useMemo(() => {
    return items.filter((a) => {
      if (filters.status.size) {
        const key = a.is_approved ? "approved" : "pending";
        if (!filters.status.has(key)) return false;
      }
      if (filters.country.size) {
        const list = a.operative_countries ?? [];
        if (!list.some((c) => filters.country.has(c))) return false;
      }
      return true;
    });
  }, [items, filters]);

  const sorted = React.useMemo(() => {
    const list = [...filtered];
    if (!sortKey) return list;
    const dir = sortDir === "ascending" ? 1 : -1;
    list.sort((a, b) => {
      const av = a[sortKey] as unknown;
      const bv = b[sortKey] as unknown;
      const norm = (v: unknown): string | number => {
        if (typeof v === "boolean") return v ? 1 : 0;
        if (typeof v === "number") return v;
        if (v == null) return "";
        const t = Date.parse(String(v));
        if (!Number.isNaN(t)) return t;
        return String(v).toLowerCase();
      };
      const ax = norm(av);
      const bx = norm(bv);
      if (ax === bx) return 0;
      return ax > bx ? dir : -dir;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const activeFilters = React.useMemo(() => {
    const arr: { type: "status" | "country"; value: string; label: string }[] =
      [];
    filters.status.forEach((v) =>
      arr.push({
        type: "status",
        value: v,
        label: `Estado: ${v === "approved" ? "Aprobada" : "Pendiente"}`,
      }),
    );
    filters.country.forEach((v) =>
      arr.push({ type: "country", value: v, label: `País: ${v}` }),
    );
    return arr;
  }, [filters]);

  const removeFilter = React.useCallback(
    (type: "status" | "country", value: string) => {
      setFilters((f) => {
        if (type === "status") {
          const next = new Set(f.status);
          next.delete(value as "approved" | "pending");
          return { ...f, status: next };
        }
        const next = new Set(f.country);
        next.delete(value);
        return { ...f, country: next };
      });
    },
    [],
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Popover placement="bottom-start">
          <PopoverTrigger>
            <Button variant="flat" startContent={<Filter size={16} />}>
              Filtros
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-4 w-64">
            <div className="grid gap-4">
              <CheckboxGroup
                label="Estado"
                value={[...filters.status]}
                onChange={(vals) =>
                  setFilters((f) => ({
                    ...f,
                    status: new Set(vals as ("approved" | "pending")[]),
                  }))
                }
              >
                <Checkbox value="approved">Aprobadas</Checkbox>
                <Checkbox value="pending">Pendientes</Checkbox>
              </CheckboxGroup>
              {allCountries.length > 0 && (
                <Select
                  label="País operativo"
                  selectionMode="multiple"
                  selectedKeys={filters.country}
                  onSelectionChange={(keys) =>
                    setFilters((f) => ({
                      ...f,
                      country: new Set(Array.from(keys as Set<string>)),
                    }))
                  }
                >
                  {allCountries.map((c) => (
                    <SelectItem key={c}>{c}</SelectItem>
                  ))}
                </Select>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {activeFilters.map((f) => (
          <Chip
            key={`${f.type}-${f.value}`}
            onClose={() => removeFilter(f.type, f.value)}
            variant="flat"
          >
            {f.label}
          </Chip>
        ))}

        <span className="ml-auto text-default-400 text-small">
          Total {sorted.length}{" "}
          {sorted.length === 1 ? "agencia" : "agencias"}
        </span>
        <Chip size="sm" variant="flat" classNames={bhChip("blue")}>
          {sorted.length} {sorted.length === 1 ? "agencia" : "agencias"}
        </Chip>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 shadow-none">
        {/* Headers */}
        <div
          className={`grid ${DESKTOP_GRID} items-center gap-3 px-4 py-3 border-b border-white/[0.06]`}
        >
          {columns.map((col) => (
            <HeaderCell
              key={col.uid}
              col={col}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
          ))}
        </div>

        {sorted.length === 0 ? (
          <div className="px-4 py-10 text-center text-bh-fg-3">
            No hay agencias.
          </div>
        ) : (
          sorted.map((a) => {
            const isOpen = expanded.has(a.id);
            return (
              <div
                key={a.id}
                className="border-b border-white/[0.04] last:border-b-0"
              >
                {/* Main row */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() => toggleExpand(a.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(a.id);
                    }
                  }}
                  className={`grid ${DESKTOP_GRID} items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/[0.02] focus:outline-none focus-visible:bg-white/[0.04] ${
                    isOpen ? "bg-white/[0.025]" : ""
                  }`}
                >
                  {/* Expander */}
                  <div className="flex items-center justify-center">
                    <ChevronRight
                      size={16}
                      className={`text-bh-fg-3 transition-transform duration-150 ${
                        isOpen ? "rotate-90 text-bh-lime" : ""
                      }`}
                    />
                  </div>

                  {/* Name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AgencyLogo src={a.logo_url} name={a.name} />
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-bh-fg-1">
                        {a.name}
                      </div>
                      <div className="truncate text-[11px] text-bh-fg-4">
                        /{a.slug}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex justify-start">
                    <Chip
                      size="sm"
                      variant="flat"
                      classNames={bhChip(statusTone(a.is_approved))}
                    >
                      {statusLabel(a.is_approved)}
                    </Chip>
                  </div>

                  {/* Agents count */}
                  <div className="flex justify-center">
                    <span
                      className={`inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-0.5 font-bh-mono text-[11px] font-bold ${
                        a.agent_count > 0
                          ? "bg-[rgba(0,194,255,0.10)] text-bh-blue"
                          : "bg-white/[0.04] text-bh-fg-4"
                      }`}
                    >
                      {a.agent_count}
                    </span>
                  </div>

                  {/* Players count */}
                  <div className="flex justify-center">
                    <span
                      className={`inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-0.5 font-bh-mono text-[11px] font-bold ${
                        a.player_count > 0
                          ? "bg-[rgba(204,255,0,0.10)] text-bh-lime"
                          : "bg-white/[0.04] text-bh-fg-4"
                      }`}
                    >
                      {a.player_count}
                    </span>
                  </div>

                  {/* Headquarters */}
                  <div className="min-w-0 truncate text-[13px] text-bh-fg-2">
                    {a.headquarters ?? (
                      <span className="text-bh-fg-4">—</span>
                    )}
                  </div>

                  {/* Created */}
                  <div className="text-[12px] text-bh-fg-3">
                    {formatDate(a.created_at)}
                  </div>

                  {/* Actions */}
                  <div
                    className="flex justify-end gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip content="Ver Perfil Público">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        as={Link}
                        href={`/agency/${a.slug}`}
                        target="_blank"
                        aria-label="Ver perfil público"
                      >
                        <ExternalLink size={16} />
                      </Button>
                    </Tooltip>
                    {a.website_url ? (
                      <Tooltip content="Sitio web">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          as="a"
                          href={a.website_url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Abrir sitio web"
                        >
                          <Globe size={16} />
                        </Button>
                      </Tooltip>
                    ) : null}
                    <Tooltip content={copied === a.id ? "Copiado!" : "Copiar ID"}>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="faded"
                        aria-label="Copiar ID"
                        onPress={() => copyId(a.id)}
                      >
                        <Copy size={16} />
                      </Button>
                    </Tooltip>
                  </div>
                </div>

                {/* Expansion */}
                {isOpen ? (
                  <div className="border-t border-white/[0.04] bg-bh-surface-2/20 px-4 py-3 md:px-6 md:py-4">
                    <AgencyAgentsList agents={a.agents} agencyName={a.name} />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden grid gap-3">
        {sorted.length === 0 ? (
          <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 px-4 py-10 text-center text-bh-fg-3">
            No hay agencias.
          </div>
        ) : (
          sorted.map((a) => {
            const isOpen = expanded.has(a.id);
            return (
              <div
                key={a.id}
                className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 overflow-hidden"
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() => toggleExpand(a.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(a.id);
                    }
                  }}
                  className="cursor-pointer p-4 space-y-3 focus:outline-none focus-visible:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AgencyLogo src={a.logo_url} name={a.name} />
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-bh-fg-1">
                          {a.name}
                        </div>
                        <div className="truncate text-[11px] text-bh-fg-4">
                          /{a.slug}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className={`shrink-0 text-bh-fg-3 transition-transform duration-150 ${
                        isOpen ? "rotate-90 text-bh-lime" : ""
                      }`}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip
                      size="sm"
                      variant="flat"
                      classNames={bhChip(statusTone(a.is_approved))}
                    >
                      {statusLabel(a.is_approved)}
                    </Chip>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-bh-mono text-[11px] text-bh-fg-2">
                      <span className="text-bh-blue font-bold">
                        {a.agent_count}
                      </span>
                      <span className="text-bh-fg-4">agentes</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-bh-mono text-[11px] text-bh-fg-2">
                      <span className="text-bh-lime font-bold">
                        {a.player_count}
                      </span>
                      <span className="text-bh-fg-4">jugadores</span>
                    </span>
                  </div>
                  <div
                    className="flex justify-end gap-1.5 pt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip content="Ver Perfil Público">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        as={Link}
                        href={`/agency/${a.slug}`}
                        target="_blank"
                        aria-label="Ver perfil público"
                      >
                        <ExternalLink size={16} />
                      </Button>
                    </Tooltip>
                    <Tooltip content={copied === a.id ? "Copiado!" : "Copiar ID"}>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="faded"
                        aria-label="Copiar ID"
                        onPress={() => copyId(a.id)}
                      >
                        <Copy size={16} />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
                {isOpen ? (
                  <div className="border-t border-white/[0.04] bg-bh-surface-2/20 px-4 py-3">
                    <AgencyAgentsList agents={a.agents} agencyName={a.name} />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
