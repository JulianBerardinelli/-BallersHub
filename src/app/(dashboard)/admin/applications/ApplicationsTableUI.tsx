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
} from "@heroui/react";
import { Copy, Filter, UserCheck, Eye, Check } from "lucide-react";
import ClientDate from "@/components/common/ClientDate";
import TeamCrest from "@/components/teams/TeamCrest";
import type { ApplicationRow } from "./types";
import { applicationColumns } from "./columns";
import type { SortDescriptor, Key } from "@react-types/shared";
import { useAdminModalPreset } from "../ui/modalPresets";
import TaskBadge from "./components/TaskBadge";
import TeamNameTicker from "./components/TeamNameTicker";
import ConfirmApplicationModal from "./components/ConfirmApplicationModal";
import PersonalInfoModal, {
  type PersonalInfoFormValues,
} from "./components/PersonalInfoModal";

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

  const handleApprovePersonalInfo = React.useCallback(
    async (id: string) => {
      const res = await fetch(`/api/admin/applications/${id}/personal-info/approve`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? "No se pudo aprobar los datos personales.");
      }
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
    },
    [setItems, setModal],
  );

  const handleSavePersonalInfo = React.useCallback(
    async (id: string, values: PersonalInfoFormValues) => {
      const res = await fetch(`/api/admin/applications/${id}/personal-info/update`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: values.full_name,
          birth_date: values.birth_date,
          height_cm: values.height_cm,
          weight_kg: values.weight_kg,
          nationalities: values.nationalities,
          position: values.position,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? "No se pudieron guardar los datos.");
      }
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                applicant: values.full_name,
                birth_date: values.birth_date,
                height_cm: values.height_cm,
                weight_kg: values.weight_kg,
                nationalities: values.nationalities,
                positions: [values.position.role, ...values.position.subs],
              }
            : it,
        ),
      );
    },
    [setItems],
  );

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
  }, [copied, copyId]);

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
                <ConfirmApplicationModal
                  application={openItem}
                  classNames={modalPreset.classNames}
                  onClose={onClose}
                />
              );
            }

            return (
              <PersonalInfoModal
                application={openItem}
                mode={modal.mode === "review" ? "review" : "detail"}
                classNames={modalPreset.classNames}
                onApprove={() => handleApprovePersonalInfo(openItem.id)}
                onSave={(values) => handleSavePersonalInfo(openItem.id, values)}
              />
            );
          }}
        </ModalContent>
      </Modal>
    </>
  );
}