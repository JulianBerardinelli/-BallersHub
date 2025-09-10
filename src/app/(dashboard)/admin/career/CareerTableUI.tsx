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
  Avatar,
  Tooltip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@heroui/react";
import { Eye, Pencil, Trash2, Check } from "lucide-react";
import CountryFlag from "@/components/common/CountryFlag";
import ClientDate from "@/components/common/ClientDate";
import TeamCrest from "@/components/teams/TeamCrest";
import { useAdminModalPreset } from "../ui/modalPresets";
import { careerColumns } from "./columns";
import type { CareerRow, CareerItem } from "./types";
import { Globe, Instagram, Link as LinkIcon } from "lucide-react";
import { Input } from "@heroui/react";
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
      className={`flex items-center gap-2 min-w-0 p-1 rounded-md ${
        editing ? "bg-warning-50" : ""
      }`}
    >
      <Avatar src={crest} className="w-6 h-6 shrink-0" />
      <span className="truncate">{item.team_name}</span>
      <span className="text-neutral-500">· {item.division ?? "—"}</span>
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
            <Button size="sm" variant="light" onPress={() => setEditing(true)}>
              <Pencil size={14} />
            </Button>
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

  const renderCell = React.useCallback((t: CareerRow, columnKey: React.Key) => {
    switch (columnKey) {
      case "id":
        return <span className="truncate block">{t.id}</span>;
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
          <div className="relative flex items-center gap-2">
            {t.status === "pending" ? (
              <Tooltip content="Procesar" color="foreground">
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() => setModal({ kind: "process", id: t.id })}
                >
                  <Eye size={16} />
                </Button>
              </Tooltip>
            ) : (
              <>
                <Tooltip content="Detalles" color="foreground">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => setModal({ kind: "details", id: t.id })}
                  >
                    <Eye size={16} />
                  </Button>
                </Tooltip>
                <Tooltip content="Editar" color="foreground">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => setModal({ kind: "edit", id: t.id })}
                  >
                    <Pencil size={16} />
                  </Button>
                </Tooltip>
                <Tooltip content="Eliminar" color="danger">
                  <Button isIconOnly size="sm" variant="light" isDisabled>
                    <Trash2 size={16} />
                  </Button>
                </Tooltip>
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  }, []);

  return (
    <>
      {err && <p className="text-sm text-red-500 mb-2">{err}</p>}
      <Table sortDescriptor={sort} onSortChange={setSort} aria-label="Trayectorias">
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
        <TableBody emptyContent={"No hay solicitudes"} items={sorted}>
          {(item) => (
            <TableRow key={item.id}>
              {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
            </TableRow>
          )}
        </TableBody>
      </Table>

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
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {openItem.applicant ?? "(sin nombre)"}
                    </span>
                    {openItem.nationalities.map((c) => (
                      <CountryFlag key={c} code={c} size={14} />
                    ))}
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
