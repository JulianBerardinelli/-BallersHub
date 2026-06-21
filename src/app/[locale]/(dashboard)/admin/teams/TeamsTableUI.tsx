// src/app/(dashboard)/admin/teams/TeamsTableUI.tsx
"use client";

import * as React from "react";
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Chip, Tooltip, Button, Modal, ModalContent, ModalBody,
  ModalHeader, ModalFooter,
} from "@heroui/react";
import { Eye, Pencil, Trash2, Plus, AlertTriangle } from "lucide-react";
import TeamCrest from "@/components/teams/TeamCrest";

import TeamEditCard, { TeamEditableInput } from "./team_edit_card";
import CsvImporter from "@/components/admin/CsvImporter";
import { bulkUpsertTeams } from "./bulkActions";
import { deleteTeam } from "./actions";


import { teamColumns } from "./columns";
import type { TeamRow } from "./types";
import type { SortDescriptor, Key } from "@react-types/shared";
import CountryFlag from "@/components/common/CountryFlag";
import ClientDate from "@/components/common/ClientDate";
import { useAdminModalPreset } from "../ui/modalPresets";
import { bhTableClassNames, bhChip } from "@/lib/ui/heroui-brand";

const dnEs = new Intl.DisplayNames(["es"], { type: "region", fallback: "code" });

type SortDir = "ascending" | "descending";

const statusChipTone: Record<TeamRow["status"], "success" | "warning" | "danger"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

export default function TeamsTableUI({ items: initialItems, allDivisions = [] }: { items: TeamRow[], allDivisions?: any[] }) {
  const modalPreset = useAdminModalPreset();
  const [items, setItems] = React.useState<TeamRow[]>(initialItems);

  // Estado de orden (tipo oficial de React Aria)
  const [sort, setSort] = React.useState<SortDescriptor>({
    column: "created_at" as Key,
    direction: "descending",
  });

  // Modales
  const [modal, setModal] = React.useState<{ kind: "review" | "details" | "edit" | null; id: string | null }>({
    kind: null, id: null,
  });

  const openItem = React.useMemo(
    () => (modal.id ? items.find((x) => x.id === modal.id) ?? null : null),
    [items, modal.id]
  );

  // Alta manual + borrado
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<TeamRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteErr, setDeleteErr] = React.useState<string | null>(null);

  // Merge de una fila editada en la tabla, recomputando la división (que se
  // muestra en la columna "Categoría") a partir del division_id devuelto.
  const applyRowUpdate = React.useCallback(
    (updated: any) => {
      setItems((prev) =>
        prev.map((t) => {
          if (t.id !== updated.id) return t;
          const divId = updated.division_id ?? updated.division?.id ?? null;
          const div = (allDivisions ?? []).find((d) => d.id === divId) || null;
          return {
            ...t,
            ...updated,
            division: div ? { id: div.id, name: div.name, crest_url: div.crest_url } : null,
          };
        }),
      );
    },
    [allDivisions],
  );

  // Inserta el equipo recién creado al tope de la tabla.
  const applyRowInsert = React.useCallback(
    (row: any) => {
      const divId = row.division_id ?? null;
      const div = (allDivisions ?? []).find((d) => d.id === divId) || null;
      const newRow: TeamRow = {
        id: row.id,
        name: row.name,
        slug: row.slug ?? null,
        country: row.country ?? null,
        country_code: row.country_code ?? null,
        city: row.city ?? null,
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        category: row.category ?? null,
        transfermarkt_url: row.transfermarkt_url ?? null,
        status: row.status,
        crest_url: row.crest_url ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at ?? null,
        requested_in_application_id: row.requested_in_application_id ?? null,
        division: div ? { id: div.id, name: div.name, crest_url: div.crest_url } : null,
      };
      setItems((prev) => [newRow, ...prev]);
    },
    [allDivisions],
  );

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteErr(null);
    try {
      const res = await deleteTeam(deleteTarget.id);
      if (!res.success) throw new Error(res.message ?? "No se pudo eliminar el equipo.");
      setItems((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteErr(e?.message ?? "Error inesperado al eliminar.");
    } finally {
      setDeleting(false);
    }
  }

  // Comparador robusto (dates/strings)
  const cmp = React.useCallback((a: unknown, b: unknown, dir: SortDir) => {
    const toKey = (v: unknown) => {
      if (typeof v === "string") {
        const t = Date.parse(v);
        if (!Number.isNaN(t)) return t;
        return v.toLowerCase();
      }
      if (v == null) return "";
      return v as any;
    };
    const av = toKey(a);
    const bv = toKey(b);
    if (av === bv) return 0;
    const res = av > bv ? 1 : -1;
    return dir === "ascending" ? res : -res;
  }, []);

  const sorted = React.useMemo(() => {
    const list = [...items];
    const col = sort.column as keyof TeamRow | "actions";
    const direction = (sort.direction ?? "ascending") as SortDir;
    if (col === "actions") return list;
    list.sort((ra, rb) => cmp((ra as any)[col], (rb as any)[col], direction));
    return list;
  }, [items, sort, cmp]);

  const onSortChange = (desc: SortDescriptor) => setSort(desc);

  const renderCell = React.useCallback((t: TeamRow, columnKey: React.Key) => {
    switch (columnKey) {
      case "name": {
        const crestSrc =
          t.crest_url && t.crest_url.trim() !== ""
            ? `${t.crest_url}?v=${Date.parse(t.updated_at ?? "") || 0}`
            : null;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <TeamCrest src={crestSrc} size={28} />
            <div className="min-w-0">
              <div className="truncate font-medium">{t.name}</div>
              <div className="text-[11px] text-bh-fg-4 truncate">{t.slug ?? "—"}</div>
            </div>
          </div>
        );
      }

      case "country": {
        const ccode = t.country_code || undefined;
        const countryName = ccode ? (dnEs.of(ccode) || ccode) : (t.country ?? "—");
        return (
          <span className="truncate block">
            <span className="inline-flex items-center gap-1">
              <CountryFlag
                code={ccode}
                title={countryName}
                size={16}
              />
              <span className="truncate">{countryName}</span>
            </span>
          </span>
        );
      }

      case "city":
        // City comes from the geo backfill (migration 0008); "—" flags a team
        // still without a location → spot the ungeocoded ones at a glance.
        return t.city ? (
          <span className="truncate block" title={t.city}>
            {t.city}
          </span>
        ) : (
          <span className="text-bh-fg-4">—</span>
        );

      case "category":
        return (
          <div className="flex items-center gap-2 max-w-[200px]">
            {t.division && t.division.crest_url && (
              <img src={t.division.crest_url} alt="" className="w-5 h-5 object-contain shrink-0" />
            )}
            <span className="truncate block text-sm text-bh-fg-2">
               {t.division ? t.division.name : (t.category ?? "—")}
            </span>
          </div>
        );

      case "status":
        return <Chip size="sm" variant="flat" classNames={bhChip(statusChipTone[t.status])} className="capitalize">{t.status}</Chip>;

      case "created_at":
        return <ClientDate iso={t.created_at} />;

      case "actions":
        return (
          <div className="flex justify-end gap-2">
            {t.status === "pending" ? (
              <Tooltip content="Procesar solicitud de equipo">
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  startContent={<Eye className="size-4" />}
                  onPress={() => setModal({ kind: "review", id: t.id })}
                >
                  Process
                </Button>
              </Tooltip>
            ) : (
              <>
                <Tooltip content="Detalles del equipo">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    startContent={<Eye className="size-4" />}
                    onPress={() => setModal({ kind: "details", id: t.id })}
                  >

                  </Button>
                </Tooltip>
                <Tooltip content="Editar equipo">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    startContent={<Pencil className="size-4" />}
                    onPress={() => setModal({ kind: "edit", id: t.id })}
                  >

                  </Button>
                </Tooltip>
              </>
            )}
            <Tooltip color="danger" content="Eliminar equipo">
              <Button
                isIconOnly
                size="sm"
                color="danger"
                variant="light"
                aria-label="Eliminar equipo"
                startContent={<Trash2 className="size-4" />}
                onPress={() => { setDeleteErr(null); setDeleteTarget(t); }}
              >

              </Button>
            </Tooltip>
          </div>
        );

      default:
        return (t as any)[columnKey as keyof TeamRow] ?? "—";
    }
  }, []);

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2 mb-4">
        <CsvImporter
          buttonLabel="Importar CSV (Equipos)"
          title="Importación Masiva de Equipos"
          expectedColumns={["name", "slug", "country_code", "category", "division_slug", "crest_url", "transfermarkt_url"]}
          onImport={bulkUpsertTeams}
          onSuccess={() => window.location.reload()}
        />
        <Button
          color="primary"
          startContent={<Plus className="size-4" />}
          onPress={() => setCreateOpen(true)}
        >
          Crear equipo
        </Button>
      </div>
      
      {/* Tabla DESKTOP */}
      <div className="hidden md:block">
        <Table
          aria-label="Equipos"
          sortDescriptor={sort}
          onSortChange={onSortChange}
          classNames={{ ...bhTableClassNames, table: "table-fixed w-full" }}
        >
          <TableHeader columns={teamColumns}>
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

          <TableBody emptyContent="No hay equipos." items={sorted}>
            {(item) => (
              <TableRow key={item.id}>
                {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* MOBILE */}
      <div className="md:hidden grid gap-3">
        {sorted.map((t) => (
          <div key={t.id} className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-4">
            <div className="flex items-center gap-3">
              <TeamCrest src={t.crest_url || null} size={36} />
              <div className="min-w-0">
                <div className="truncate font-medium">{t.name}</div>
                <div className="text-[11px] text-bh-fg-4 truncate">
                  {t.country ?? "—"}{t.city ? ` · ${t.city}` : ""}{t.category ? ` · ${t.category}` : ""}
                </div>
              </div>
              <div className="ml-auto">
                <Chip size="sm" variant="flat" classNames={bhChip(statusChipTone[t.status])} className="capitalize">
                  {t.status}
                </Chip>
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              {t.status === "pending" ? (
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  startContent={<Eye className="size-4" />}
                  onPress={() => setModal({ kind: "review", id: t.id })}
                >
                  Process
                </Button>
              ) : (
                <>
                  <Button
                    isIconOnly size="sm" variant="flat"
                    startContent={<Eye className="size-4" />}
                    aria-label="Ver detalles"
                    onPress={() => setModal({ kind: "details", id: t.id })}
                  />
                  <Button
                    isIconOnly size="sm" variant="flat"
                    startContent={<Pencil className="size-4" />}
                    aria-label="Editar equipo"
                    onPress={() => setModal({ kind: "edit", id: t.id })}
                  />
                </>
              )}
              <Button
                isIconOnly size="sm" color="danger" variant="light"
                startContent={<Trash2 className="size-4" />}
                aria-label="Eliminar equipo"
                onPress={() => { setDeleteErr(null); setDeleteTarget(t); }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Process (propuesta pendiente) → mismo formulario que Editar + aprobar/rechazar */}
      <Modal
        isOpen={modal.kind === "review" && !!openItem}
        // usar onOpenChange para cerrar con swipe en mobile y con la X
        onOpenChange={(open) => {
          if (!open) setModal({ kind: null, id: null });
        }}
        {...modalPreset}
      >
        <ModalContent>
          {() => {
            if (!openItem) return null;
            return (
              <>
                <ModalHeader className={modalPreset.classNames?.header}>
                  <div className="font-medium truncate pr-2">Procesar solicitud de equipo</div>
                </ModalHeader>

                <ModalBody className={modalPreset.classNames?.body}>
                  <TeamEditCard
                    team={openItem as any}
                    allDivisions={allDivisions}
                    mode="review"
                    onSaved={(updated) => applyRowUpdate(updated)}
                    onApproved={() => window.location.reload()}
                    onRejected={() => window.location.reload()}
                    onCancel={() => setModal({ kind: null, id: null })}
                  />
                </ModalBody>
              </>
            );
          }}
        </ModalContent>
      </Modal>


      {/* Modal: Details */}
      <Modal
        isOpen={modal.kind === "details" && !!openItem}
        onOpenChange={(open) => {
          if (!open) setModal({ kind: null, id: null });
        }}
        {...modalPreset}
      >
        <ModalContent>
          {() => {
            if (!openItem) return null;
            const crestSrc = openItem.crest_url
              ? `${openItem.crest_url}?v=${Date.parse(openItem.updated_at ?? "") || 0}`
              : null;
            return (
              <>
                <ModalHeader className={modalPreset.classNames?.header}>
                  <div className="flex items-center gap-3 min-w-0">
                    <TeamCrest src={crestSrc} size={40} className="shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{openItem.name}</div>
                      <div className="text-xs text-bh-fg-3 truncate">
                        {openItem.slug ?? "—"}
                      </div>
                    </div>
                    <Chip
                      size="sm"
                      variant="flat"
                      classNames={bhChip(statusChipTone[openItem.status])}
                      className="capitalize ml-auto"
                    >
                      {openItem.status}
                    </Chip>
                  </div>
                </ModalHeader>
                <ModalBody className={modalPreset.classNames?.body}>
                  <div className="grid gap-4 text-sm">
                    <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-bh-fg-3 mb-1">País</p>
                          <p className="font-medium text-bh-fg-2">
                            {openItem.country ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-bh-fg-3 mb-1">Ciudad</p>
                          <p className="font-medium text-bh-fg-2">
                            {openItem.city ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-bh-fg-3 mb-1">División</p>
                          <p className="font-medium text-bh-fg-2">
                            {openItem.category ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-bh-fg-3 mb-1">Creado</p>
                          <p className="font-medium text-bh-fg-2">
                            <ClientDate iso={openItem.created_at} />
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-bh-fg-3 mb-1">Solicitud vinculada</p>
                          <p className="font-medium text-bh-fg-2">
                            {openItem.requested_in_application_id ? "Desde una aplicación" : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                    {openItem.transfermarkt_url && (
                      <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-4">
                        <p className="text-xs text-bh-fg-3 mb-1">Transfermarkt</p>
                        <a
                          href={openItem.transfermarkt_url}
                          target="_blank"
                          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                        >
                          Ver ficha
                        </a>
                      </div>
                    )}
                  </div>
                </ModalBody>
              </>
            );
          }}
        </ModalContent>
      </Modal>

      {/* Modal: Edit (stub) */}
      <Modal
        isOpen={modal.kind === "edit" && !!openItem}
        onOpenChange={(open) => !open && setModal({ kind: null, id: null })}
        {...modalPreset}
      >
        <ModalContent>
          {(_onClose) => {
            if (!openItem) return null;
            const item = openItem as TeamEditableInput;

            return (
              <>
                <ModalHeader className={modalPreset.classNames?.header}>
                  <div className="font-medium truncate pr-2">Editar equipo</div>
                </ModalHeader>

                <ModalBody className={modalPreset.classNames?.body}>
                  <TeamEditCard
                    team={item}
                    allDivisions={allDivisions}
                    onSaved={(updated) => {
                      applyRowUpdate(updated);
                      setModal({ kind: null, id: null });
                    }}
                    onCancel={() => setModal({ kind: null, id: null })}
                  />
                </ModalBody>
              </>
            );
          }}
        </ModalContent>
      </Modal>

      {/* Modal: Crear equipo a mano */}
      <Modal
        isOpen={createOpen}
        onOpenChange={(open) => !open && setCreateOpen(false)}
        {...modalPreset}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className={modalPreset.classNames?.header}>
                <div className="font-medium truncate pr-2">Crear equipo</div>
              </ModalHeader>

              <ModalBody className={modalPreset.classNames?.body}>
                <TeamEditCard
                  mode="create"
                  team={{ id: "", name: "", status: "approved", crest_url: "/images/team-default.svg" }}
                  allDivisions={allDivisions}
                  onCreated={(created) => {
                    applyRowInsert(created);
                    setCreateOpen(false);
                  }}
                  onCancel={() => setCreateOpen(false)}
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: Confirmar eliminación */}
      <Modal
        isOpen={!!deleteTarget}
        onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}
        placement="center"
        backdrop="blur"
        classNames={{ base: "bg-bh-surface-1 border border-white/[0.08]" }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex items-center gap-2 text-bh-fg-1">
                <AlertTriangle className="size-5 text-danger" />
                Eliminar equipo
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-bh-fg-2">
                  Vas a eliminar <span className="font-semibold text-bh-fg-1">{deleteTarget?.name}</span> de
                  forma permanente. Esta acción no se puede deshacer.
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-bh-fg-3">
                  <li>Los jugadores y cuerpo técnico que lo tengan como club actual quedarán sin equipo.</li>
                  <li>Las entradas de trayectoria que lo referencien quedarán sin equipo vinculado.</li>
                  <li>Se eliminarán sus propuestas y relaciones con agencias asociadas.</li>
                </ul>
                {deleteErr && <p className="mt-1 text-sm text-red-500">{deleteErr}</p>}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={() => setDeleteTarget(null)} isDisabled={deleting} className="text-bh-fg-3">
                  Cancelar
                </Button>
                <Button color="danger" onPress={handleConfirmDelete} isLoading={deleting}>
                  Eliminar equipo
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}


