"use client";

import * as React from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  CheckboxGroup,
  Checkbox,
  Select,
  SelectItem,
  User,
} from "@heroui/react";
import { Copy, Filter, ExternalLink, Edit } from "lucide-react";
import Link from "next/link";
import TeamCrest from "@/components/teams/TeamCrest";
import type { PlayerProfileRow } from "./types";
import { columns } from "./columns";
import type { SortDescriptor, Key } from "@react-types/shared";
import TeamNameTicker from "./components/TeamNameTicker";

const statusColors: Record<PlayerProfileRow["status"], "success" | "warning" | "danger" | "default"> = {
  approved: "success",
  pending_review: "warning",
  rejected: "danger",
  draft: "default",
};

const statusLabels: Record<PlayerProfileRow["status"], string> = {
  approved: "Aprobado",
  pending_review: "Revisión",
  rejected: "Rechazado",
  draft: "Borrador",
};

const planColors: Record<PlayerProfileRow["plan"], "default" | "primary" | "warning"> = {
  free: "default",
  pro: "primary",
  pro_plus: "warning",
};

const planLabels: Record<PlayerProfileRow["plan"], string> = {
  free: "Básico",
  pro: "Pro",
  pro_plus: "Pro Plus",
};

type SortDir = "ascending" | "descending";

export default function PlayersTableUI({ items }: { items: PlayerProfileRow[] }) {
  const [sort, setSort] = React.useState<SortDescriptor>({
    column: "created_at" as Key,
    direction: "descending",
  });

  const [copied, setCopied] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState({
    status: new Set<string>(),
    plan: new Set<string>(),
    country: new Set<string>(),
  });

  const cmp = React.useCallback((a: unknown, b: unknown, dir: SortDir) => {
    const toKey = (v: unknown): string | number => {
      if (typeof v === "string") {
        const t = Date.parse(v);
        if (!Number.isNaN(t)) return t;
        return v.toLowerCase();
      }
      if (v == null) return "";
      return v as number;
    };
    const av = toKey(a);
    const bv = toKey(b);
    if (av === bv) return 0;
    const res = av > bv ? 1 : -1;
    return dir === "ascending" ? res : -res;
  }, []);

  const copyId = React.useCallback((id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const allCountries = React.useMemo(
    () =>
      Array.from(
        new Set(items.flatMap((i) => i.nationalities.map((n) => n.name)))
      ).sort(),
    [items],
  );

  const filtered = React.useMemo(() => {
    return items.filter((i) => {
      if (filters.status.size && !filters.status.has(i.status)) return false;
      if (filters.plan.size && !filters.plan.has(i.plan)) return false;
      if (
        filters.country.size &&
        !i.nationalities.some((c) => filters.country.has(c.name))
      )
        return false;
      return true;
    });
  }, [items, filters]);

  const sorted = React.useMemo(() => {
    const list = [...filtered];
    const col = sort.column as keyof PlayerProfileRow | "actions" | "current_team";
    const direction = (sort.direction ?? "ascending") as SortDir;
    if (col === "actions" || col === "current_team") return list;
    list.sort((a, b) =>
      cmp(
        (a as Record<string, unknown>)[col],
        (b as Record<string, unknown>)[col],
        direction,
      ),
    );
    return list;
  }, [filtered, sort, cmp]);

  const activeFilters = React.useMemo(() => {
    const arr: { type: keyof typeof filters; value: string; label: string }[] = [];
    filters.status.forEach((v) => arr.push({ type: "status", value: v, label: `Estado: ${statusLabels[v as PlayerProfileRow["status"]] || v}` }));
    filters.plan.forEach((v) => arr.push({ type: "plan", value: v, label: `Plan: ${planLabels[v as PlayerProfileRow["plan"]] || v}` }));
    filters.country.forEach((v) => arr.push({ type: "country", value: v, label: `País: ${v}` }));
    return arr;
  }, [filters]);

  const removeFilter = React.useCallback(
    (type: keyof typeof filters, value: string) => {
      setFilters((f) => {
        const next = new Set(f[type]);
        next.delete(value);
        return { ...f, [type]: next };
      });
    },
    [],
  );

  const renderCell = React.useCallback(
    (a: PlayerProfileRow, columnKey: React.Key): React.ReactNode => {
      switch (columnKey) {
        case "full_name":
          return (
            <div className="flex items-center gap-2">
              <User
                avatarProps={{ radius: "lg", src: a.avatar_url, size: "sm" }}
                description={
                  a.nationalities.length > 0
                    ? a.nationalities.map((n) => n.name).join(", ")
                    : "Sin nacionalidad"
                }
                name={a.full_name}
              />
            </div>
          );

        case "plan":
          return (
            <Chip size="sm" variant="flat" color={planColors[a.plan]} className="capitalize">
              {planLabels[a.plan]}
            </Chip>
          );

        case "status":
          return (
            <Chip size="sm" variant="flat" color={statusColors[a.status]} className="capitalize">
              {statusLabels[a.status]}
            </Chip>
          );

        case "market_value_eur":
          return a.market_value_eur ? (
            <span className="font-medium text-success-500">
              {new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              }).format(a.market_value_eur)}
            </span>
          ) : (
            <span className="text-default-400">—</span>
          );

        case "current_team": {
          if (a.current_team_name) {
            return (
              <div className="flex items-center gap-2 min-w-0">
                <TeamCrest src={a.current_team_crest_url || null} size={20} />
                <div className="flex-1 min-w-0">
                  <TeamNameTicker
                    name={a.current_team_name}
                    countryCode={a.current_team_country_code}
                  />
                </div>
              </div>
            );
          }
          return <span className="text-default-500">Libre / Sin Equipo</span>;
        }

        case "actions":
          return (
            <div className="flex justify-end gap-2">
              <Tooltip content="Ver Perfil Público">
                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  as={Link}
                  href={`/player/${a.slug}`}
                  target="_blank"
                >
                  <ExternalLink size={16} />
                </Button>
              </Tooltip>
              <Tooltip content={copied === a.id ? "Copiado!" : "Copiar ID"}>
                <Button
                  isIconOnly
                  size="sm"
                  variant="faded"
                  onPress={() => copyId(a.id)}
                >
                  <Copy size={16} />
                </Button>
              </Tooltip>
            </div>
          );

        default:
          return (
            (a as Record<string, unknown>)[columnKey as string] ?? "—"
          ) as React.ReactNode;
      }
    },
    [copied, copyId],
  );

  const topContent = React.useMemo(() => {
    return (
      <div className="flex items-center gap-3">
        <span className="text-default-400 text-small">Total {items.length} Jugadores</span>
        <Chip size="sm" variant="flat" color="primary">
          {items.length} Jugadores
        </Chip>
      </div>
    );
  }, [items.length]);

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
                  setFilters((f) => ({ ...f, status: new Set(vals) }))
                }
              >
                <Checkbox value="approved">Aprobado</Checkbox>
                <Checkbox value="pending_review">Revisión</Checkbox>
                <Checkbox value="draft">Borrador</Checkbox>
              </CheckboxGroup>
              <CheckboxGroup
                label="Plan"
                value={[...filters.plan]}
                onChange={(vals) => setFilters((f) => ({ ...f, plan: new Set(vals) }))}
              >
                <Checkbox value="free">Gratis</Checkbox>
                <Checkbox value="pro">Pro</Checkbox>
                <Checkbox value="pro_plus">Pro Plus</Checkbox>
              </CheckboxGroup>
              {allCountries.length > 0 && (
                <Select
                  label="País"
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
            className="capitalize"
          >
            {f.label}
          </Chip>
        ))}
      </div>

      <div className="hidden md:block">
        <Table
          aria-label="Directorio de jugadores"
          sortDescriptor={sort}
          onSortChange={setSort}
          removeWrapper
          classNames={{ table: "table-fixed w-full" }}
          topContent={topContent}
          topContentPlacement="outside"
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn
                key={column.uid}
                allowsSorting={!!column.sortable}
                align={column.align ?? "start"}
                className={column.className}
              >
                {column.name}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody emptyContent="No hay jugadores." items={sorted}>
            {(item) => (
              <TableRow key={item.id}>
                {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden grid gap-3">
        {sorted.map((a) => (
          <div key={a.id} className="rounded-lg border border-neutral-800 p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <User
                avatarProps={{ radius: "lg", src: a.avatar_url, size: "sm" }}
                description={
                  a.nationalities.length > 0
                    ? a.nationalities.map((n) => n.name).join(", ")
                    : "Sin nacionalidad"
                }
                name={a.full_name}
              />
              <div className="flex items-center gap-2">
                <Chip size="sm" variant="flat" color={statusColors[a.status]} className="capitalize">
                  {statusLabels[a.status]}
                </Chip>
              </div>
            </div>
            <div className="text-sm">
              {a.current_team_name ? (
                <div className="flex items-center gap-2">
                  <TeamCrest src={a.current_team_crest_url || null} size={20} />
                  <div className="flex-1 min-w-0">
                    <TeamNameTicker
                      name={a.current_team_name}
                      countryCode={a.current_team_country_code}
                    />
                  </div>
                </div>
              ) : (
                <span className="text-default-500">Libre / Sin Equipo</span>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Tooltip content="Ver Perfil Público">
                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  as={Link}
                  href={`/player/${a.slug}`}
                  target="_blank"
                >
                  <ExternalLink size={16} />
                </Button>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
