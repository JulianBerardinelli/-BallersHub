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
  Popover,
  PopoverTrigger,
  PopoverContent,
  CheckboxGroup,
  Checkbox,
  User,
} from "@heroui/react";
import { Filter, Settings } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { bhTableClassNames, bhChip } from "@/lib/ui/heroui-brand";
import type { SortDescriptor, Key } from "@react-types/shared";
import type { CoachAdminRow, CoachAdminStatus, CoachAdminPlan } from "./types";

type ChipTone = Parameters<typeof bhChip>[0];

const statusTones: Record<CoachAdminStatus, ChipTone> = {
  approved: "success",
  pending_review: "warning",
  rejected: "danger",
  draft: "neutral",
};
const statusLabels: Record<CoachAdminStatus, string> = {
  approved: "Aprobado",
  pending_review: "Revisión",
  rejected: "Rechazado",
  draft: "Borrador",
};
const planTones: Record<CoachAdminPlan, ChipTone> = { free: "neutral", pro: "blue" };
const planLabels: Record<CoachAdminPlan, string> = { free: "Básico", pro: "Pro" };

type SortDir = "ascending" | "descending";

const COLUMNS = [
  { uid: "full_name", name: "Entrenador", sortable: true },
  { uid: "role_title", name: "Rol", sortable: true },
  { uid: "current_club", name: "Club", sortable: true },
  { uid: "plan", name: "Plan", sortable: true },
  { uid: "status", name: "Estado", sortable: true },
  { uid: "actions", name: "", sortable: false, align: "end" as const },
];

const ROW_MENU_ITEM_CLASS =
  "flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[13px] text-bh-fg-2 transition-colors hover:bg-white/[0.06] hover:text-bh-fg-1";

const RowOptions = React.memo(function RowOptions({
  a,
  copyId,
}: {
  a: CoachAdminRow;
  copyId: (id: string) => void;
}) {
  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <Button isIconOnly size="sm" variant="flat" aria-label="Opciones del entrenador">
          <Settings size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[210px] p-1">
        <div className="flex w-full flex-col">
          <Link href={`/coach/${a.slug}`} target="_blank" className={ROW_MENU_ITEM_CLASS}>
            Ver perfil público
          </Link>
          <div className="my-1 h-px bg-white/[0.08]" />
          <Link href={`/admin/coaches/${a.id}/edit`} className={ROW_MENU_ITEM_CLASS}>
            Editar perfil
          </Link>
          <Link href={`/admin/coaches/${a.id}/edit/trayectoria`} className={ROW_MENU_ITEM_CLASS}>
            Editar trayectoria
          </Link>
          <Link href={`/admin/coaches/${a.id}/edit/multimedia`} className={ROW_MENU_ITEM_CLASS}>
            Editar multimedia
          </Link>
          <div className="my-1 h-px bg-white/[0.08]" />
          <button type="button" onClick={() => copyId(a.id)} className={ROW_MENU_ITEM_CLASS}>
            Copiar ID
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
});

export default function CoachesTableUI({ items }: { items: CoachAdminRow[] }) {
  const [sort, setSort] = React.useState<SortDescriptor>({
    column: "full_name" as Key,
    direction: "ascending",
  });
  const [filters, setFilters] = React.useState({
    status: new Set<string>(),
    plan: new Set<string>(),
  });

  const copyId = React.useCallback((id: string) => navigator.clipboard.writeText(id), []);

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

  const filtered = React.useMemo(
    () =>
      items.filter((i) => {
        if (filters.status.size && !filters.status.has(i.status)) return false;
        if (filters.plan.size && !filters.plan.has(i.plan)) return false;
        return true;
      }),
    [items, filters],
  );

  const sorted = React.useMemo(() => {
    const list = [...filtered];
    const col = sort.column as keyof CoachAdminRow | "actions";
    const direction = (sort.direction ?? "ascending") as SortDir;
    if (col === "actions") return list;
    list.sort((a, b) =>
      cmp((a as Record<string, unknown>)[col], (b as Record<string, unknown>)[col], direction),
    );
    return list;
  }, [filtered, sort, cmp]);

  const renderCell = React.useCallback(
    (a: CoachAdminRow, columnKey: React.Key): React.ReactNode => {
      switch (columnKey) {
        case "full_name":
          return (
            <User
              avatarProps={{ radius: "lg", src: a.avatar_url, size: "sm" }}
              description={a.nationality.length > 0 ? a.nationality.join(", ") : "Sin nacionalidad"}
              name={a.full_name}
            />
          );
        case "role_title":
          return <span className="text-bh-fg-2">{a.role_title || "Director Técnico"}</span>;
        case "current_club":
          return a.current_club ? (
            <span className="text-bh-fg-2">{a.current_club}</span>
          ) : (
            <span className="text-bh-fg-3">Libre / Sin club</span>
          );
        case "plan":
          return (
            <Chip size="sm" variant="flat" classNames={bhChip(planTones[a.plan])}>
              {planLabels[a.plan]}
            </Chip>
          );
        case "status":
          return (
            <Chip size="sm" variant="flat" classNames={bhChip(statusTones[a.status])}>
              {statusLabels[a.status]}
            </Chip>
          );
        case "actions":
          return (
            <div className="flex justify-end">
              <RowOptions a={a} copyId={copyId} />
            </div>
          );
        default:
          return ((a as Record<string, unknown>)[columnKey as string] ?? "—") as React.ReactNode;
      }
    },
    [copyId],
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
          <PopoverContent className="w-56 p-4">
            <div className="grid gap-4">
              <CheckboxGroup
                label="Estado"
                value={[...filters.status]}
                onChange={(vals) => setFilters((f) => ({ ...f, status: new Set(vals) }))}
              >
                <Checkbox value="approved">Aprobado</Checkbox>
                <Checkbox value="pending_review">Revisión</Checkbox>
                <Checkbox value="rejected">Rechazado</Checkbox>
                <Checkbox value="draft">Borrador</Checkbox>
              </CheckboxGroup>
              <CheckboxGroup
                label="Plan"
                value={[...filters.plan]}
                onChange={(vals) => setFilters((f) => ({ ...f, plan: new Set(vals) }))}
              >
                <Checkbox value="free">Básico</Checkbox>
                <Checkbox value="pro">Pro</Checkbox>
              </CheckboxGroup>
            </div>
          </PopoverContent>
        </Popover>
        <span className="text-small text-default-400">Total {items.length} entrenadores</span>
      </div>

      <div className="hidden md:block">
        <Table
          aria-label="Directorio de entrenadores"
          sortDescriptor={sort}
          onSortChange={setSort}
          classNames={{ ...bhTableClassNames, table: "table-fixed w-full" }}
        >
          <TableHeader columns={COLUMNS}>
            {(column) => (
              <TableColumn key={column.uid} allowsSorting={column.sortable} align={column.align ?? "start"}>
                {column.name}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody emptyContent="No hay entrenadores." items={sorted}>
            {(item) => (
              <TableRow key={item.id}>
                {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {sorted.map((a) => (
          <div key={a.id} className="space-y-2 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-4">
            <div className="flex items-center justify-between gap-3">
              <User
                avatarProps={{ radius: "lg", src: a.avatar_url, size: "sm" }}
                description={a.role_title || "Director Técnico"}
                name={a.full_name}
              />
              <Chip size="sm" variant="flat" classNames={bhChip(statusTones[a.status])}>
                {statusLabels[a.status]}
              </Chip>
            </div>
            <div className="text-sm text-bh-fg-3">{a.current_club || "Libre / Sin club"}</div>
            <div className="flex justify-end">
              <RowOptions a={a} copyId={copyId} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
