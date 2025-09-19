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
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
} from "@heroui/react";
import {
  Copy,
  Filter,
  UserCheck,
  Eye,
  Check,
  Info,
  Globe,
  Instagram,
  Link as LinkIcon,
  FileText,
  Camera,
} from "lucide-react";
import clsx from "classnames";
import ClientDate from "@/components/common/ClientDate";
import TeamCrest from "@/components/teams/TeamCrest";
import CountryFlag from "@/components/common/CountryFlag";
import CountryMultiPicker, {
  type CountryPick,
} from "@/components/common/CountryMultiPicker";
import PositionPicker, {
  type PositionPickerValue,
} from "@/components/common/PositionPicker";
import type { ApplicationRow } from "./types";
import { applicationColumns } from "./columns";
import type { SortDescriptor, Key } from "@react-types/shared";
import { useAdminModalPreset } from "../ui/modalPresets";

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

const birthDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function formatBirthDate(value: string | null) {
  if (!value) return "—";
  try {
    const iso = value.length <= 10 ? `${value}T00:00:00` : value;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return birthDateFormatter.format(date);
  } catch (e) {
    return "—";
  }
}

const careerStatusMeta: Record<
  string,
  { label: string; color: "default" | "success" | "warning" | "primary" | "danger" }
> = {
  accepted: { label: "Aprobada", color: "success" },
  approved: { label: "Aprobada", color: "success" },
  waiting: { label: "Esperando equipo", color: "primary" },
  pending: { label: "Pendiente", color: "default" },
  draft: { label: "Borrador", color: "default" },
  rejected: { label: "Rechazada", color: "danger" },
};

const teamStatusMeta: Record<
  string,
  { label: string; color: "default" | "success" | "warning" | "danger" }
> = {
  pending: { label: "Equipo pendiente", color: "warning" },
  approved: { label: "Equipo aprobado", color: "success" },
  rejected: { label: "Equipo rechazado", color: "danger" },
};

function formatYearRange(start: number | null, end: number | null) {
  const startLabel = start ?? "—";
  const endLabel = end ?? "…";
  return `${startLabel}–${endLabel}`;
}

function TeamNameTicker({
  name,
  countryCode,
}: {
  name: string;
  countryCode: string | null;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = React.useState(false);

  const measure = React.useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    const distance = content.scrollWidth - container.clientWidth;
    if (distance > 2) {
      setOverflow(true);
      content.style.setProperty("--marquee-distance", `${distance}px`);
    } else {
      setOverflow(false);
      content.style.removeProperty("--marquee-distance");
    }
  }, []);

  React.useEffect(() => {
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [measure, name, countryCode]);

  React.useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  if (!name) {
    return <span className="text-default-500">—</span>;
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden max-w-full"
      title={name}
    >
      <div
        ref={contentRef}
        className={clsx(
          "flex items-center gap-1 min-w-0",
          overflow && "bh-marquee",
        )}
      >
        <span className="truncate">{name}</span>
        {countryCode && <CountryFlag code={countryCode} size={16} />}
      </div>
      {overflow && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-5"
            aria-hidden
            style={{
              background:
                "linear-gradient(to right, var(--heroui-colors-background) 0%, transparent 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-5"
            aria-hidden
            style={{
              background:
                "linear-gradient(to left, var(--heroui-colors-background) 0%, transparent 100%)",
            }}
          />
        </>
      )}
    </div>
  );
}

type SortDir = "ascending" | "descending";

function TaskBadge({
  tasks,
  onPress,
}: {
  tasks: ApplicationRow["tasks"];
  onPress: () => void;
}) {
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
      variant="faded"
      onClick={onPress}
      className={`cursor-pointer transition-opacity duration-200 w-32 justify-start border ${
        fade ? "opacity-0" : "opacity-100"
      } ${t.className}`}
      startContent={<Info size={14} />}
    >
      {t.label}
    </Chip>
  );
}

export default function ApplicationsTableUI({ items: initialItems }: { items: ApplicationRow[] }) {
  const [items, setItems] = React.useState<ApplicationRow[]>(initialItems);
  const modalPreset = useAdminModalPreset();
  const [modal, setModal] = React.useState<{
    id: string;
    mode: "detail" | "review" | "tasks" | "confirm";
  } | null>(null);
  const openItem = React.useMemo(
    () => (modal ? items.find((i) => i.id === modal.id) ?? null : null),
    [items, modal],
  );
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

  const approvePersonalInfo = React.useCallback(async (id: string) => {
    await fetch(`/api/admin/applications/${id}/personal-info/approve`, {
      method: "POST",
    });
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              personal_info_approved: true,
              tasks: it.tasks.filter((t) => t.label !== "Informacion"),
            }
          : it,
      ),
    );
    setModal(null);
  }, []);

  const [editingInfo, setEditingInfo] = React.useState(false);
  const [editForm, setEditForm] = React.useState<{
    full_name: string;
    birth_date: string;
    height_cm: string;
    weight_kg: string;
    nationalities: CountryPick[];
    position: PositionPickerValue;
  }>({
    full_name: "",
    birth_date: "",
    height_cm: "",
    weight_kg: "",
    nationalities: [],
    position: { role: "DEL", subs: [] },
  });

  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const minChars = (v: string, n = 3) => (v?.trim()?.length ?? 0) >= n;

  const hVal = editForm.height_cm ? Number(editForm.height_cm) : NaN;
  const wVal = editForm.weight_kg ? Number(editForm.weight_kg) : NaN;
  const nameInvalid = !!touched.full_name && !minChars(editForm.full_name);
  const natInvalid = !!touched.nationalities && editForm.nationalities.length < 1;
  const dobInvalid = !!touched.birth_date && !editForm.birth_date;
  const heightInvalid =
    !!touched.height_cm &&
    !(Number.isFinite(hVal) && hVal >= 120 && hVal <= 230);
  const weightInvalid =
    !!touched.weight_kg &&
    !(Number.isFinite(wVal) && wVal >= 40 && wVal <= 140);
  const posInvalid =
    !!touched.position && editForm.position.subs.length < 1;
  const formValid =
    minChars(editForm.full_name) &&
    editForm.nationalities.length >= 1 &&
    !!editForm.birth_date &&
    Number.isFinite(hVal) &&
    hVal >= 120 &&
    hVal <= 230 &&
    Number.isFinite(wVal) &&
    wVal >= 40 &&
    wVal <= 140 &&
    editForm.position.subs.length >= 1;

  React.useEffect(() => {
    if (openItem && modal && (modal.mode === "detail" || modal.mode === "review")) {
      setEditingInfo(false);
      setTouched({});
      setEditForm({
        full_name: openItem.applicant ?? "",
        birth_date: openItem.birth_date ?? "",
        height_cm: openItem.height_cm?.toString() ?? "",
        weight_kg: openItem.weight_kg?.toString() ?? "",
        nationalities: openItem.nationalities.map((n) => ({
          code: n.code ?? "",
          name: n.name,
        })),
        position: openItem.positions.length
          ? {
              role: openItem.positions[0] as PositionPickerValue["role"],
              subs: openItem.positions.slice(1),
            }
          : { role: "DEL", subs: [] },
      });
    }
  }, [openItem, modal]);

  const savePersonalInfo = React.useCallback(async () => {
    setTouched({
      full_name: true,
      nationalities: true,
      birth_date: true,
      height_cm: true,
      weight_kg: true,
      position: true,
    });
    if (!openItem || !formValid) return;

    await fetch(`/api/admin/applications/${openItem.id}/personal-info/update`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        full_name: editForm.full_name,
        birth_date: editForm.birth_date,
        height_cm: Number(editForm.height_cm),
        weight_kg: Number(editForm.weight_kg),
        nationalities: editForm.nationalities,
        position: editForm.position,
      }),
    });
    setItems((prev) =>
      prev.map((it) =>
        it.id === openItem.id
          ? {
              ...it,
              applicant: editForm.full_name,
              birth_date: editForm.birth_date,
              height_cm: Number(editForm.height_cm),
              weight_kg: Number(editForm.weight_kg),
              nationalities: editForm.nationalities,
              positions: [
                editForm.position.role,
                ...editForm.position.subs,
              ],
            }
          : it,
      ),
    );
    setEditingInfo(false);
  }, [openItem, editForm, formValid, setItems]);

  type CareerItem = {
    id: string;
    status: string;
    team_status: string | null;
    team_name: string;
    crest_url: string | null;
    country_code: string | null;
    division: string | null;
    start_year: number | null;
    end_year: number | null;
  };

  const [careerItems, setCareerItems] = React.useState<CareerItem[] | null>(null);

  React.useEffect(() => {
    if (modal?.mode === "confirm" && openItem) {
      setCareerItems(null);
      fetch(`/api/admin/applications/${openItem.id}/career`)
        .then((r) => r.json())
        .then((d) => setCareerItems(d.items ?? []))
        .catch(() => setCareerItems([]));
    }
  }, [modal, openItem]);

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
              <div className="text-xs text-neutral-500 truncate">
                {a.nationalities.map((n) => n.name).join(", ")}
              </div>
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
        return (
          <TaskBadge
            tasks={a.tasks}
            onPress={() => setModal({ id: a.id, mode: "tasks" })}
          />
        );

      case "actions":
        return (
          <div className="flex justify-end gap-2">
            <Tooltip
              content={
                a.personal_info_approved ? "Ver datos" : "Revisar datos"
              }
            >
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                onPress={() =>
                  setModal({
                    id: a.id,
                    mode: a.personal_info_approved ? "detail" : "review",
                  })
                }
              >
                {a.personal_info_approved ? (
                  <Eye size={16} />
                ) : (
                  <UserCheck size={16} />
                )}
              </Button>
            </Tooltip>
            {a.status === "pending" && (
              <Tooltip content="Aceptar solicitud">
                <Button
                  isIconOnly
                  size="sm"
                  color="success"
                  isDisabled={a.tasks.length > 0}
                  onPress={() => setModal({ id: a.id, mode: "confirm" })}
                >
                  <Check size={16} />
                </Button>
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
                  <div className="text-xs text-neutral-500 truncate">
                    {a.nationalities.map((n) => n.name).join(", ")}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Chip size="sm" variant="flat" color={statusColor[a.status]} className="capitalize">
                  {a.status}
                </Chip>
                <TaskBadge
                  tasks={a.tasks}
                  onPress={() => setModal({ id: a.id, mode: "tasks" })}
                />
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
              ) : a.free_agent ? (
                <span>Libre</span>
              ) : a.proposed_team_name ? (
                <span className="text-amber-400">Propuso: {a.proposed_team_name}</span>
              ) : (
                <span>—</span>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Tooltip content={a.personal_info_approved ? "Ver datos" : "Revisar datos"}>
                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  onPress={() =>
                    setModal({
                      id: a.id,
                      mode: a.personal_info_approved ? "detail" : "review",
                    })
                  }
                >
                  {a.personal_info_approved ? (
                    <Eye size={16} />
                  ) : (
                    <UserCheck size={16} />
                  )}
                </Button>
              </Tooltip>
              {a.status === "pending" && (
                <Tooltip content="Aceptar solicitud">
                  <Button
                    isIconOnly
                    size="sm"
                    color="success"
                    isDisabled={a.tasks.length > 0}
                    onPress={() => setModal({ id: a.id, mode: "confirm" })}
                  >
                    <Check size={16} />
                  </Button>
                </Tooltip>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modal !== null && !!openItem}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
        {...modalPreset}
      >
        <ModalContent>
          {(onClose) => {
            if (!openItem || !modal) return null;
            if (modal.mode === "tasks") {
              return (
                <>
                  <ModalHeader className={modalPreset.classNames?.header}>
                    <div>
                      <h3 className="font-semibold">Tareas pendientes</h3>
                      <p className="text-sm text-foreground-500">
                        Resolvé estas tareas antes de aceptar.
                      </p>
                    </div>
                  </ModalHeader>
                  <ModalBody className={modalPreset.classNames?.body}>
                    <div className="flex flex-wrap gap-2">
                      {openItem.tasks.map((t, i) => (
                        <Chip key={i} variant="faded" className={`border ${t.className}`}>
                          {t.label}
                        </Chip>
                      ))}
                    </div>
                  </ModalBody>
                </>
              );
            }

            if (modal.mode === "confirm") {
              return (
                <>
                  <ModalHeader className={modalPreset.classNames?.header}>
                    <div className="flex flex-col">
                      <h3 className="font-semibold">Confirmar solicitud</h3>
                      <p className="text-sm text-foreground-500">
                        Revisá la información antes de aceptar.
                      </p>
                    </div>
                  </ModalHeader>
                  <ModalBody className={modalPreset.classNames?.body}>
                    <div className="grid gap-5">
                      <div className="rounded-xl bg-content2/60 p-5 ring-1 ring-white/10">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base font-medium truncate">
                            {openItem.applicant ?? "(sin nombre)"}
                          </span>
                          {openItem.nationalities.map((n, i) =>
                            n.code ? <CountryFlag key={i} code={n.code} size={16} /> : null,
                          )}
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-default-500 mb-1">Fecha de nacimiento</p>
                            <p className="font-medium text-default-700">
                              {formatBirthDate(openItem.birth_date)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-default-500 mb-1">Altura</p>
                            <p className="font-medium text-default-700">
                              {openItem.height_cm ? `${openItem.height_cm} cm` : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-default-500 mb-1">Peso</p>
                            <p className="font-medium text-default-700">
                              {openItem.weight_kg ? `${openItem.weight_kg} kg` : "—"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-default-600">
                            Trayectoria aprobada
                          </p>
                          <p className="text-xs text-default-500">
                            Revisá los clubes confirmados antes de aceptar la solicitud.
                          </p>
                        </div>
                        {careerItems === null ? (
                          <div className="flex justify-center py-6">
                            <Spinner />
                          </div>
                        ) : careerItems.length > 0 ? (
                          <ul className="grid gap-2">
                            {careerItems.map((ci) => {
                              const statusMeta =
                                careerStatusMeta[ci.status] ?? {
                                  label: ci.status,
                                  color: "default" as const,
                                };
                              const teamMeta = ci.team_status
                                ? teamStatusMeta[ci.team_status] ?? null
                                : null;
                              return (
                                <li
                                  key={ci.id}
                                  className="flex items-center gap-3 rounded-xl bg-content2/60 p-3 ring-1 ring-white/10"
                                >
                                  <TeamCrest
                                    src={ci.crest_url || "/images/team-default.svg"}
                                    size={28}
                                    className="shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-medium truncate">
                                        {ci.team_name}
                                      </span>
                                      {ci.country_code && (
                                        <CountryFlag code={ci.country_code} size={14} />
                                      )}
                                    </div>
                                    <p className="text-xs text-default-500 truncate">
                                      {ci.division ?? "Sin división especificada"}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <Chip size="sm" variant="flat">
                                      {formatYearRange(ci.start_year, ci.end_year)}
                                    </Chip>
                                    <Chip size="sm" variant="bordered" color={statusMeta.color}>
                                      {statusMeta.label}
                                    </Chip>
                                    {teamMeta && (
                                      <Chip size="sm" variant="bordered" color={teamMeta.color}>
                                        {teamMeta.label}
                                      </Chip>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <div className="rounded-xl bg-content2/60 p-4 text-sm text-default-500 ring-1 ring-white/10">
                            Sin trayectoria aprobada todavía.
                          </div>
                        )}
                      </div>

                      {openItem.proposed_team_name && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-default-600">
                            Equipo propuesto
                          </p>
                          <div className="flex items-center gap-3 rounded-xl bg-content2/60 p-4 ring-1 ring-white/10">
                            <TeamCrest src={null} size={28} className="shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {openItem.proposed_team_name}
                              </p>
                            </div>
                            {openItem.proposed_team_country_code && (
                              <CountryFlag
                                code={openItem.proposed_team_country_code}
                                size={18}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={onClose}>
                      Cancelar
                    </Button>
                    <form
                      action={`/api/admin/applications/${openItem.id}/approve`}
                      method="post"
                    >
                      <Button color="success" type="submit">
                        Aceptar solicitud
                      </Button>
                    </form>
                  </ModalFooter>
                </>
              );
            }

            return (
              <>
                <ModalHeader className={modalPreset.classNames?.header}>
                  <div className="flex items-start gap-2 w-full">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-medium truncate">
                          {openItem.applicant ?? "(sin nombre)"}
                        </span>
                        {openItem.nationalities.map((n, i) =>
                          n.code ? <CountryFlag key={i} code={n.code} size={14} /> : null,
                        )}
                      </div>
                      <span className="text-xs text-default-500">
                        {modal.mode === "review"
                          ? "Revisar datos personales"
                          : "Detalle del jugador"}
                      </span>
                    </div>
                    <div className="ml-auto flex gap-2">
                      {openItem.links.map((l, i) => {
                        const low = l.url.toLowerCase();
                        let Icon = LinkIcon;
                        if (low.includes("instagram")) Icon = Instagram;
                        else if (
                          low.includes("transfermarkt") ||
                          low.includes("besoccer")
                        )
                          Icon = Globe;
                        return (
                          <a key={i} href={l.url} target="_blank" className="text-default-500">
                            <Icon size={16} />
                          </a>
                        );
                      })}
                      {!editingInfo && (
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => setEditingInfo(true)}
                        >
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>
                </ModalHeader>
                <ModalBody className={modalPreset.classNames?.body}>
                  {editingInfo ? (
                    <div className="grid gap-4">
                      <Input
                        isRequired
                        label="Nombre completo"
                        value={editForm.full_name}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, full_name: e.target.value }))
                        }
                        onBlur={() => setTouched((t) => ({ ...t, full_name: true }))}
                        isInvalid={nameInvalid}
                        errorMessage="Ingresá al menos 3 caracteres."
                      />
                      <div
                        onBlurCapture={() =>
                          setTouched((t) => ({ ...t, nationalities: true }))
                        }
                      >
                        <CountryMultiPicker
                          key={`nat-${openItem.id}`}
                          defaultValue={editForm.nationalities}
                          onChange={(vals) =>
                            setEditForm((f) => ({ ...f, nationalities: vals }))
                          }
                          isInvalid={natInvalid}
                          errorMessage="Seleccioná al menos una nacionalidad."
                        />
                      </div>
                      <Input
                        isRequired
                        label="Fecha de nacimiento"
                        type="date"
                        value={editForm.birth_date}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, birth_date: e.target.value }))
                        }
                        onBlur={() => setTouched((t) => ({ ...t, birth_date: true }))}
                        isInvalid={dobInvalid}
                        errorMessage="Seleccioná la fecha de nacimiento."
                      />
                      <div className="flex flex-wrap gap-6">
                        <Input
                          isRequired
                          label="Altura (cm)"
                          type="number"
                          value={editForm.height_cm}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              height_cm: e.target.value,
                            }))
                          }
                          onBlur={() => setTouched((t) => ({ ...t, height_cm: true }))}
                          isInvalid={heightInvalid}
                          errorMessage="Ingresá una altura válida (120–230 cm)."
                          endContent={<span className="text-xs text-foreground-500">cm</span>}
                        />
                        <Input
                          isRequired
                          label="Peso (kg)"
                          type="number"
                          value={editForm.weight_kg}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              weight_kg: e.target.value,
                            }))
                          }
                          onBlur={() => setTouched((t) => ({ ...t, weight_kg: true }))}
                          isInvalid={weightInvalid}
                          errorMessage="Ingresá un peso válido (40–140 kg)."
                          endContent={<span className="text-xs text-foreground-500">kg</span>}
                        />
                      </div>
                      <div className="grid gap-2">
                        <span className="text-sm text-default-500">Posición</span>
                        <div
                          className={[
                            "rounded-2xl border p-3",
                            posInvalid ? "border-danger" : "border-default",
                          ].join(" ")}
                          onBlur={(e) => {
                            const next = e.relatedTarget as Node | null;
                            if (!next || !e.currentTarget.contains(next)) {
                              setTouched((t) => ({ ...t, position: true }));
                            }
                          }}
                        >
                          <PositionPicker
                            key={`pos-${openItem.id}`}
                            defaultRole={editForm.position.role}
                            defaultSubs={editForm.position.subs}
                            onChange={(val) =>
                              setEditForm((f) => ({ ...f, position: val }))
                            }
                          />
                        </div>
                        {posInvalid && (
                          <p className="text-sm text-danger">
                            Elegí al menos una sub-posición.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 text-sm">
                      <div>
                        <p className="text-sm text-default-500 mb-1">Nacionalidades</p>
                        <div className="flex flex-wrap gap-2">
                          {openItem.nationalities.map((n, i) => (
                            <Chip
                              key={i}
                              size="sm"
                              variant="faded"
                              startContent={
                                n.code ? <CountryFlag code={n.code} size={16} /> : null
                              }
                              className="text-default-700"
                            >
                              {n.name}
                            </Chip>
                          ))}
                        </div>
                      </div>
                      {openItem.positions.length > 0 && (
                        <div>
                          <p className="text-sm text-default-500 mb-1">Posiciones</p>
                          <div className="flex flex-wrap gap-2">
                            {openItem.positions.map((p, i) => (
                              <Chip key={i} size="sm" variant="faded">
                                {p}
                              </Chip>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-6">
                        <div>
                          <p className="text-sm text-default-500 mb-1">Fecha de nacimiento</p>
                          <p>{formatBirthDate(openItem.birth_date)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-default-500 mb-1">Edad</p>
                          <p>{openItem.age ?? "—"}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-6">
                        <div>
                          <p className="text-sm text-default-500 mb-1">Altura</p>
                          <p>{openItem.height_cm ? `${openItem.height_cm} cm` : "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-default-500 mb-1">Peso</p>
                          <p>{openItem.weight_kg ? `${openItem.weight_kg} kg` : "—"}</p>
                        </div>
                      </div>
                      {openItem.kyc_docs.length > 0 && (
                        <div>
                          <p className="text-sm text-default-500 mb-1">Documentos KYC</p>
                          <div className="flex gap-2">
                            {openItem.kyc_docs.map((d, i) => {
                              const Icon = d.label === "Documento" ? FileText : Camera;
                              return (
                                <a
                                  key={i}
                                  href={d.url}
                                  target="_blank"
                                  className="text-default-500"
                                >
                                  <Icon size={16} />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  {editingInfo ? (
                    <>
                      <Button variant="flat" onPress={() => setEditingInfo(false)}>
                        Cancelar
                      </Button>
                      <Button color="primary" onPress={savePersonalInfo}>
                        Guardar
                      </Button>
                    </>
                  ) : modal.mode === "review" ? (
                    <Button
                      color="primary"
                      className="ml-auto"
                      onPress={() => approvePersonalInfo(openItem.id)}
                    >
                      Aceptar datos
                    </Button>
                  ) : null}
                </ModalFooter>
              </>
            );
          }}
        </ModalContent>
      </Modal>
    </>
  );
}