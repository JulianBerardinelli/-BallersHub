// src/app/(dashboard)/admin/applications/ApplicationsTableUI.tsx
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
} from "@heroui/react";
import { Copy, Filter } from "lucide-react";
import ClientDate from "@/components/common/ClientDate";
import TeamCrest from "@/components/teams/TeamCrest";
import CountryFlag from "@/components/common/CountryFlag";
import type { ApplicationRow } from "./types";
import { applicationColumns } from "./columns";
import type { SortDescriptor, Key } from "@react-types/shared";

const statusColor: Record<ApplicationRow["status"], "success" | "warning" | "danger"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

const planColor: Record<ApplicationRow["plan"], "default" | "primary" | "warning"> = {
  free: "default",
  pro: "primary",
  pro_plus: "warning",
};

type SortDir = "ascending" | "descending";

function TaskBadge({ tasks }: { tasks: ApplicationRow["tasks"] }) {
  const [index, setIndex] = React.useState(0);
  const [fade, setFade] = React.useState(false);

  React.useEffect(() => {
    if (tasks.length <= 1) return;
    const id = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % tasks.length);
        setFade(false);
      }, 200);
    }, 3000);
    return () => clearInterval(id);
  }, [tasks.length]);

  if (!tasks.length) return <span className="text-default-500">—</span>;
  const t = tasks[index];
  return (
    <Chip
      size="sm"
      className={`${t.color} text-white transition-opacity duration-200 ${
        fade ? "opacity-0" : "opacity-100"
      }`}
      startContent={<span className="font-bold">{index + 1}</span>}
      variant="solid"
    >
      {t.label}
    </Chip>
  );
}

export default function ApplicationsTableUI({ items: initialItems }: { items: ApplicationRow[] }) {
  const [items] = React.useState<ApplicationRow[]>(initialItems);
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
    () => Array.from(new Set(items.flatMap((i) => i.nationalities))).sort(),
    [items],
  );

  const filtered = React.useMemo(() => {
    return items.filter((i) => {
      if (filters.status.size && !filters.status.has(i.status)) return false;
      if (filters.plan.size && !filters.plan.has(i.plan)) return false;
      if (
        filters.country.size &&
        !i.nationalities.some((c) => filters.country.has(c))
      )
        return false;
      return true;
    });
  }, [items, filters]);

  const sorted = React.useMemo(() => {
    const list = [...filtered];
    const col = sort.column as keyof ApplicationRow | "actions" | "current_team";
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
    filters.status.forEach((v) => arr.push({ type: "status", value: v, label: `Estado: ${v}` }));
    filters.plan.forEach((v) => arr.push({ type: "plan", value: v, label: `Plan: ${v}` }));
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
    (a: ApplicationRow, columnKey: React.Key): React.ReactNode => {
    switch (columnKey) {
      case "id":
        return (
          <Tooltip content={copied === a.id ? "Copiado!" : "Copiar ID"}>
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              onPress={() => copyId(a.id)}
            >
              <Copy size={16} />
            </Button>
          </Tooltip>
        );

      case "applicant":
        return (
          <div className="min-w-0">
            <div className="truncate font-medium">{a.applicant ?? "(sin nombre)"}</div>
            {a.nationalities.length > 0 && (
              <div className="text-xs text-neutral-500 truncate">{a.nationalities.join(", ")}</div>
            )}
          </div>
        );

      case "plan":
        return (
          <Chip size="sm" variant="flat" color={planColor[a.plan]} className="capitalize">
            {a.plan}
          </Chip>
        );

      case "status":
        return (
          <Chip size="sm" variant="flat" color={statusColor[a.status]} className="capitalize">
            {a.status}
          </Chip>
        );

      case "created_at":
        return <ClientDate iso={a.created_at} />;

      case "current_team": {
        if (a.current_team_name) {
          return (
            <span className="inline-flex items-center gap-2 truncate">
              <TeamCrest src={a.current_team_crest_url || null} size={20} />
              <span className="truncate">{a.current_team_name}</span>
              {a.current_team_country_code && (
                <CountryFlag code={a.current_team_country_code} size={16} />
              )}
            </span>
          );
        }
        if (a.free_agent) {
          return <span className="text-default-500">Libre</span>;
        }
        if (a.proposed_team_name) {
          return (
            <span className="text-amber-400 truncate block">
              Propuso: {a.proposed_team_name}
            </span>
          );
        }
        return <span>—</span>;
      }

      case "tasks":
        return <TaskBadge tasks={a.tasks} />;

      case "actions":
        return (
          <div className="flex justify-end gap-2">
            {a.status === "pending" && (
              <form action={`/api/admin/applications/${a.id}/approve`} method="post">
                <Button size="sm" color="primary" type="submit">
                  Approve
                </Button>
              </form>
            )}
            {a.transfermarkt_url && (
              <Tooltip content="Transfermarkt">
                <a
                  className="text-xs underline"
                  href={a.transfermarkt_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  TM
                </a>
              </Tooltip>
            )}
          </div>
        );

      default:
        return (
          (a as Record<string, unknown>)[columnKey as keyof ApplicationRow] ??
          "—"
        ) as React.ReactNode;
    }
  }, []);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Popover placement="bottom-start">
          <PopoverTrigger>
            <Button variant="flat" startContent={<Filter size={16} />}>Filtros</Button>
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
                <Checkbox value="pending">pending</Checkbox>
                <Checkbox value="approved">approved</Checkbox>
                <Checkbox value="rejected">rejected</Checkbox>
              </CheckboxGroup>
              <CheckboxGroup
                label="Plan"
                value={[...filters.plan]}
                onChange={(vals) => setFilters((f) => ({ ...f, plan: new Set(vals) }))}
              >
                <Checkbox value="free">free</Checkbox>
                <Checkbox value="pro">pro</Checkbox>
                <Checkbox value="pro_plus">pro_plus</Checkbox>
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
          aria-label="Solicitudes de jugador"
          sortDescriptor={sort}
          onSortChange={setSort}
          removeWrapper
          classNames={{ table: "table-fixed w-full" }}
        >
          <TableHeader columns={applicationColumns}>
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
          <TableBody emptyContent="No hay solicitudes." items={sorted}>
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
              <div className="min-w-0">
                <div className="truncate font-medium">{a.applicant ?? "(sin nombre)"}</div>
                {a.nationalities.length > 0 && (
                  <div className="text-xs text-neutral-500 truncate">{a.nationalities.join(", ")}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Chip size="sm" variant="flat" color={statusColor[a.status]} className="capitalize">
                  {a.status}
                </Chip>
                <TaskBadge tasks={a.tasks} />
              </div>
            </div>
            <div className="text-sm">
              {a.current_team_name ? (
                <span className="inline-flex items-center gap-2">
                  <TeamCrest src={a.current_team_crest_url || null} size={20} />
                  <span className="truncate">{a.current_team_name}</span>
                </span>
              ) : a.free_agent ? (
                <span>Libre</span>
              ) : a.proposed_team_name ? (
                <span className="text-amber-400">Propuso: {a.proposed_team_name}</span>
              ) : (
                <span>—</span>
              )}
            </div>
            <div className="flex justify-end gap-2">
              {a.status === "pending" && (
                <form action={`/api/admin/applications/${a.id}/approve`} method="post">
                  <Button size="sm" color="primary" type="submit">
                    Approve
                  </Button>
                </form>
              )}
              {a.transfermarkt_url && (
                <a
                  className="text-xs underline"
                  href={a.transfermarkt_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  TM
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
