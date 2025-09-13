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
import ClientDate from "@/components/common/ClientDate";
import TeamCrest from "@/components/teams/TeamCrest";
import CountryFlag from "@/components/common/CountryFlag";
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
  const [editForm, setEditForm] = React.useState({
    full_name: "",
    birth_date: "",
    height_cm: "",
    weight_kg: "",
  });

  React.useEffect(() => {
    if (openItem && modal && (modal.mode === "detail" || modal.mode === "review")) {
      setEditingInfo(false);
      setEditForm({
        full_name: openItem.applicant ?? "",
        birth_date: openItem.birth_date ?? "",
        height_cm: openItem.height_cm?.toString() ?? "",
        weight_kg: openItem.weight_kg?.toString() ?? "",
      });
    }
  }, [openItem, modal]);

  const savePersonalInfo = React.useCallback(async () => {
    if (!openItem) return;
    await fetch(`/api/admin/applications/${openItem.id}/personal-info/update`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        full_name: editForm.full_name || null,
        birth_date: editForm.birth_date || null,
        height_cm: editForm.height_cm ? Number(editForm.height_cm) : null,
        weight_kg: editForm.weight_kg ? Number(editForm.weight_kg) : null,
      }),
    });
    setItems((prev) =>
      prev.map((it) =>
        it.id === openItem.id
          ? {
              ...it,
              applicant: editForm.full_name || null,
              birth_date: editForm.birth_date || null,
              height_cm: editForm.height_cm ? Number(editForm.height_cm) : null,
              weight_kg: editForm.weight_kg ? Number(editForm.weight_kg) : null,
            }
          : it,
      ),
    );
    setEditingInfo(false);
  }, [openItem, editForm, setItems]);

  type CareerItem = {
    id: string;
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
                    <div className="grid gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="font-medium truncate">
                          {openItem.applicant ?? "(sin nombre)"}
                        </span>
                        {openItem.nationalities.map((n, i) =>
                          n.code ? <CountryFlag key={i} code={n.code} size={14} /> : null,
                        )}
                      </div>
                      <div className="flex flex-wrap gap-6">
                        <div>
                          <p className="font-medium mb-1">Fecha de nacimiento</p>
                          <p>
                            {openItem.birth_date ? (
                              <ClientDate iso={openItem.birth_date} />
                            ) : (
                              "—"
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium mb-1">Altura</p>
                          <p>{openItem.height_cm ? `${openItem.height_cm} cm` : "—"}</p>
                        </div>
                        <div>
                          <p className="font-medium mb-1">Peso</p>
                          <p>{openItem.weight_kg ? `${openItem.weight_kg} kg` : "—"}</p>
                        </div>
                      </div>
                      {careerItems === null ? (
                        <div className="flex justify-center py-4">
                          <Spinner />
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium mb-1">Trayectoria</p>
                          <ul className="grid gap-2">
                            {careerItems.map((ci) => (
                              <li
                                key={ci.id}
                                className="flex items-center gap-2 min-w-0 p-2 rounded-lg bg-content2/60"
                              >
                                <TeamCrest
                                  src={ci.crest_url || "/images/team-default.svg"}
                                  size={24}
                                  className="shrink-0"
                                />
                                <span className="truncate font-medium">{ci.team_name}</span>
                                <span className="text-default-500 text-sm">
                                  · {ci.division ?? "—"}
                                </span>
                                {ci.country_code && (
                                  <CountryFlag code={ci.country_code} size={12} />
                                )}
                                <Chip size="sm" variant="flat">
                                  {ci.start_year ?? "—"}–{ci.end_year ?? "…"}
                                </Chip>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {openItem.proposed_team_name && (
                        <div>
                          <p className="font-medium mb-1 mt-2">Equipo propuesto</p>
                          <div className="flex items-center gap-2">
                            <TeamCrest src={null} size={24} />
                            <span className="font-medium truncate">
                              {openItem.proposed_team_name}
                            </span>
                            {openItem.proposed_team_country_code && (
                              <CountryFlag
                                code={openItem.proposed_team_country_code}
                                size={16}
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
                        label="Nombre completo"
                        value={editForm.full_name}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, full_name: e.target.value }))
                        }
                      />
                      <Input
                        label="Fecha de nacimiento"
                        type="date"
                        value={editForm.birth_date}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, birth_date: e.target.value }))
                        }
                      />
                      <div className="flex flex-wrap gap-6">
                        <Input
                          label="Altura (cm)"
                          type="number"
                          value={editForm.height_cm}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              height_cm: e.target.value,
                            }))
                          }
                        />
                        <Input
                          label="Peso (kg)"
                          type="number"
                          value={editForm.weight_kg}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              weight_kg: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 text-sm">
                      <div>
                        <p className="font-medium mb-1">Nacionalidades</p>
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
                          <p className="font-medium mb-1">Posiciones</p>
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
                          <p className="font-medium mb-1">Fecha de nacimiento</p>
                          <p>
                            {openItem.birth_date ? (
                              <ClientDate iso={openItem.birth_date} />
                            ) : (
                              "—"
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium mb-1">Edad</p>
                          <p>{openItem.age ?? "—"}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-6">
                        <div>
                          <p className="font-medium mb-1">Altura</p>
                          <p>{openItem.height_cm ? `${openItem.height_cm} cm` : "—"}</p>
                        </div>
                        <div>
                          <p className="font-medium mb-1">Peso</p>
                          <p>{openItem.weight_kg ? `${openItem.weight_kg} kg` : "—"}</p>
                        </div>
                      </div>
                      {openItem.kyc_docs.length > 0 && (
                        <div>
                          <p className="font-medium mb-1">Documentos KYC</p>
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