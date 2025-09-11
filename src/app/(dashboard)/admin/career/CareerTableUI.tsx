// src/app/(dashboard)/admin/career/CareerTableUI.tsx
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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Spinner,
  Input,
} from "@heroui/react";
import { Eye, Pencil, Trash2, Check, Copy } from "lucide-react";
import CountryFlag from "@/components/common/CountryFlag";
import ClientDate from "@/components/common/ClientDate";
import TeamCrest from "@/components/teams/TeamCrest";
import { useAdminModalPreset } from "../ui/modalPresets";
import { careerColumns } from "./columns";
import type { CareerRow, CareerItem } from "./types";
import { Globe, Instagram, Link as LinkIcon } from "lucide-react";
import type { SortDescriptor, Key } from "@react-types/shared";

type SortDir = "ascending" | "descending";

const statusColor: Record<CareerRow["status"], "success" | "warning" | "danger"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

async function post(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

async function patch(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

function EditableItem({
  item,
  onSaved,
  readOnly = false,
}: {
  item: CareerItem;
  onSaved: (ci: CareerItem) => void;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({
    start_year: item.start_year,
    end_year: item.end_year,
    division: item.division ?? "",
  });
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const crest = item.crest_url || "/images/team-default.svg";

  async function save() {
    try {
      setSaving(true);
      setErr(null);
      await patch(`/api/admin/career/${item.id}/update`, form);
      onSaved({ ...item, ...form });
      setEditing(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li
      className={`flex items-center gap-2 min-w-0 p-2 rounded-lg ring-1 ring-white/10 ${
        editing ? "bg-warning-50" : "bg-content2/60"
      }`}
    >
      <TeamCrest src={crest} size={24} className="shrink-0" />
      <span className="truncate font-medium">{item.team_name}</span>
      <span className="text-default-500 text-sm">· {item.division ?? "—"}</span>
      {item.country_code && <CountryFlag code={item.country_code} size={12} />}
      {editing ? (
        <>
          <Input
            size="sm"
            className="w-20"
            type="number"
            labelPlacement="outside"
            placeholder="Inicio"
            value={form.start_year?.toString() ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                start_year: Number.isNaN(e.target.valueAsNumber)
                  ? null
                  : e.target.valueAsNumber,
              }))
            }
          />
          <Input
            size="sm"
            className="w-20"
            type="number"
            labelPlacement="outside"
            placeholder="Fin"
            value={form.end_year?.toString() ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                end_year: Number.isNaN(e.target.valueAsNumber)
                  ? null
                  : e.target.valueAsNumber,
              }))
            }
          />
          <Input
            size="sm"
            className="w-32"
            labelPlacement="outside"
            placeholder="División"
            value={form.division}
            onChange={(e) => setForm((f) => ({ ...f, division: e.target.value }))}
          />
          <Button size="sm" color="primary" onPress={save} isLoading={saving}>
            <Check size={14} />
          </Button>
          {err && <span className="text-xs text-red-500">{err}</span>}
        </>
      ) : (
        <>
          <Chip size="sm" variant="flat">
            {item.start_year ?? "—"}–{item.end_year ?? "…"}
          </Chip>
          {!readOnly && (
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              onPress={() => setEditing(true)}
              startContent={<Pencil size={14} />}
            />
          )}
        </>
      )}
    </li>
  );
}

export default function CareerTableUI({ items: initialItems }: { items: CareerRow[] }) {
  const modalPreset = useAdminModalPreset();
  const [items, setItems] = React.useState<CareerRow[]>(initialItems);
  const [sort, setSort] = React.useState<SortDescriptor>({
    column: "created_at" as Key,
    direction: "descending",
  });
  const [modal, setModal] = React.useState<{ kind: "process" | "details" | "edit" | null; id: string | null }>({
    kind: null,
    id: null,
  });
  const [busy, setBusy] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  const openItem = React.useMemo(
    () => (modal.id ? items.find((x) => x.id === modal.id) ?? null : null),
    [items, modal.id]
  );

  const cmp = React.useCallback((a: unknown, b: unknown, dir: SortDir) => {
    const toKey = (v: unknown) => {
      if (typeof v === "string") {
        const t = Date.parse(v);
        if (!Number.isNaN(t)) return t;
        return v.toLowerCase();
      }
    if (v == null) return "";
    return v as string | number;
  };
    const av = toKey(a);
    const bv = toKey(b);
    if (av === bv) return 0;
    const res = av > bv ? 1 : -1;
    return dir === "ascending" ? res : -res;
  }, []);

  const sorted = React.useMemo(() => {
    const list = [...items];
    const col = sort.column as keyof CareerRow | "actions" | "current_team" | "country";
    const direction = sort.direction as SortDir;
    if (col === "actions" || col === "current_team" || col === "country") return list;
    list.sort((ra, rb) =>
      cmp(
        (ra as Record<string, unknown>)[col],
        (rb as Record<string, unknown>)[col],
        direction
      )
    );
    return list;
  }, [items, sort, cmp]);

  const acceptAll = async (applicationId: string) => {
    try {
      setErr(null);
      setBusy(applicationId);
      await post(`/api/admin/career/applications/${applicationId}/approve`);
      window.location.reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setBusy(null);
    }
  };

  const copyId = React.useCallback((id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const renderCell = React.useCallback((t: CareerRow, columnKey: React.Key) => {
    switch (columnKey) {
      case "id":
        return (
          <Tooltip
            content={copied === t.id ? "Copiado!" : "Copiar ID"}
          
          >
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              onPress={() => copyId(t.id)}
            >
              <Copy size={16} />
            </Button>
          </Tooltip>
        );
      case "applicant":
        return (
          <span className="truncate block">
            <span className="inline-flex items-center gap-1">
              {t.applicant ?? "(sin nombre)"}
              {t.nationalities.map((c) => (
                <CountryFlag key={c} code={c} size={14} />
              ))}
              {t.links.map((u, i) => {
                const low = u.toLowerCase();
                let Icon = LinkIcon;
                if (low.includes("instagram.com")) Icon = Instagram;
                else if (low.includes("transfermarkt") || low.includes("besoccer")) Icon = Globe;
                return (
                  <a key={i} href={u} target="_blank" className="text-default-500">
                    <Icon size={14} />
                  </a>
                );
              })}
            </span>
          </span>
        );
      case "status":
        return (
          <Chip size="sm" color={statusColor[t.status]} variant="flat" className="capitalize">
            {t.status}
          </Chip>
        );
      case "created_at":
        return <ClientDate iso={t.created_at} />;
      case "current_team": {
        const crest = t.current_team_crest_url
          ? `${t.current_team_crest_url}?v=${Date.parse(t.created_at) || 0}`
          : null;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <TeamCrest src={crest || "/images/team-default.svg"} size={24} />
            <span className="truncate">{t.current_team_name ?? "Libre"}</span>
          </div>
        );
      }
      case "country":
        return (
          <span className="truncate block">
            {t.current_team_country_code ? (
              <CountryFlag code={t.current_team_country_code} size={16} />
            ) : (
              "—"
            )}
          </span>
        );
      case "actions":
        return (
          <div className="relative flex items-center justify-end gap-2">
            {t.status === "pending" ? (
              <Tooltip content="Procesar">
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  startContent={
                    busy === t.id ? (
                      <Spinner className="text-current size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )
                  }
                  onPress={() => setModal({ kind: "process", id: t.id })}
                  isDisabled={busy === t.id}
                >
                  Process
                </Button>
              </Tooltip>
            ) : (
              <>
                <Tooltip content="Detalles">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    startContent={<Eye className="size-4" />}
                    onPress={() => setModal({ kind: "details", id: t.id })}
                  />
                </Tooltip>
                <Tooltip content="Editar">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    startContent={<Pencil className="size-4" />}
                    onPress={() => setModal({ kind: "edit", id: t.id })}
                  />
                </Tooltip>
                <Tooltip content="Eliminar" color="danger">
                  <Button
                    isIconOnly
                    size="sm"
                    color="danger"
                    variant="light"
                    startContent={<Trash2 className="size-4" />}
                    isDisabled
                  />
                </Tooltip>
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  }, [busy, copied, copyId]);

  return (
    <>
      {err && <p className="text-sm text-red-500 mb-2">{err}</p>}
      {/* DESKTOP TABLE */}
      <div className="hidden md:block">
        <Table
          aria-label="Trayectorias"
          sortDescriptor={sort}
          onSortChange={setSort}
          removeWrapper
          classNames={{ table: "table-fixed w-full" }}
        >
          <TableHeader columns={careerColumns}>
            {(col) => (
              <TableColumn
                key={col.uid}
                align={col.align as "start" | "center" | "end" | undefined}
                allowsSorting={col.sortable}
                className={col.className}
              >
                {col.name}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody emptyContent="No hay solicitudes" items={sorted}>
            {(item) => (
              <TableRow key={item.id}>
                {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden grid gap-3">
        {sorted.map((t) => (
          <div key={t.id} className="rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-3">
              <TeamCrest
                src={
                  t.current_team_crest_url
                    ? `${t.current_team_crest_url}?v=${Date.parse(t.created_at) || 0}`
                    : "/images/team-default.svg"
                }
                size={36}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium flex items-center gap-1">
                  {t.applicant ?? "(sin nombre)"}
                  {t.nationalities.map((c) => (
                    <CountryFlag key={c} code={c} size={14} />
                  ))}
                </div>
                <div className="text-xs text-neutral-500 truncate flex items-center gap-1">
                  <span className="truncate">{t.current_team_name ?? "Libre"}</span>
                  {t.current_team_country_code && (
                    <CountryFlag code={t.current_team_country_code} size={14} />
                  )}
                </div>
              </div>
              <Tooltip
                content={copied === t.id ? "Copiado!" : "Copiar ID"}
              
              >
                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  onPress={() => copyId(t.id)}
                >
                  <Copy size={16} />
                </Button>
              </Tooltip>
            </div>
            <div className="mt-3 flex justify-between items-center">
              <Chip
                size="sm"
                variant="flat"
                color={statusColor[t.status]}
                className="capitalize"
              >
                {t.status}
              </Chip>
              <div className="flex gap-2">
                {t.status === "pending" ? (
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    startContent={
                      busy === t.id ? (
                        <Spinner className="text-current size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )
                    }
                    onPress={() => setModal({ kind: "process", id: t.id })}
                    isDisabled={busy === t.id}
                  >
                    Process
                  </Button>
                ) : (
                  <>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      startContent={<Eye className="size-4" />}
                      aria-label="Detalles"
                      onPress={() => setModal({ kind: "details", id: t.id })}
                    />
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      startContent={<Pencil className="size-4" />}
                      aria-label="Editar"
                      onPress={() => setModal({ kind: "edit", id: t.id })}
                    />
                    <Button
                      isIconOnly
                      size="sm"
                      color="danger"
                      variant="light"
                      startContent={<Trash2 className="size-4" />}
                      isDisabled
                      aria-label="Eliminar"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Process / Details / Edit share same structure for now */}
      <Modal
        isOpen={modal.kind !== null && !!openItem}
        onOpenChange={(open) => !open && setModal({ kind: null, id: null })}
        {...modalPreset}
      >
        <ModalContent>
          {() => {
            if (!openItem) return null;
            const mode = modal.kind;
            return (
              <>
                <ModalHeader className={modalPreset.classNames?.header}>
                  <div className="flex items-start gap-2 w-full">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-medium truncate">
                          {openItem.applicant ?? "(sin nombre)"}
                        </span>
                        {openItem.nationalities.map((c) => (
                          <CountryFlag key={c} code={c} size={14} />
                        ))}
                      </div>
                      <span className="text-xs text-default-500">
                        {mode === "process"
                          ? "Procesar trayectoria"
                          : mode === "edit"
                          ? "Editar trayectoria"
                          : "Detalle de trayectoria"}
                      </span>
                    </div>
                    <div className="ml-auto flex gap-2">
                      {openItem.links.map((u, i) => {
                        const low = u.toLowerCase();
                        let Icon = LinkIcon;
                        if (low.includes("instagram")) Icon = Instagram;
                        else if (low.includes("transfermarkt") || low.includes("besoccer"))
                          Icon = Globe;
                        return (
                          <a key={i} href={u} target="_blank" className="text-default-500">
                            <Icon size={16} />
                          </a>
                        );
                      })}
                      {mode === "process" && (
                        <Button
                          color="primary"
                          size="sm"
                          onPress={() => acceptAll(openItem.id)}
                          isLoading={busy === openItem.id}
                        >
                          Aceptar trayectoria
                        </Button>
                      )}
                    </div>
                  </div>
                </ModalHeader>
                <ModalBody className={modalPreset.classNames?.body}>
                  <h3 className="text-sm font-semibold">Etapas de la carrera</h3>
                  <p className="text-xs text-default-500 mb-2">
                    {mode === "process"
                      ? "Verifica y ajusta la información antes de aprobar."
                      : mode === "edit"
                      ? "Modifica los datos de los clubes ya registrados."
                      : "Detalle de la trayectoria aprobada."}
                  </p>
                  <ul className="grid gap-2">
                    {openItem.items.map((it) => (
                      <EditableItem
                        key={it.id}
                        item={it}
                        readOnly={mode === "details"}
                        onSaved={(ci) =>
                          setItems((prev) =>
                            prev.map((r) =>
                              r.id === openItem.id
                                ? {
                                    ...r,
                                    items: r.items.map((x) => (x.id === ci.id ? ci : x)),
                                  }
                                : r
                            )
                          )
                        }
                      />
                    ))}
                  </ul>
                </ModalBody>
              </>
            );
          }}
        </ModalContent>
      </Modal>
    </>
  );
}