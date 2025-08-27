// src/app/(dashboard)/admin/teams/TeamsTableUI.tsx
"use client";

import * as React from "react";
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Chip, Tooltip, Button, Modal, ModalContent, ModalBody,
} from "@heroui/react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import TeamCrest from "@/components/teams/TeamCrest";
import TeamAdminCard from "./team_admin_card"; // se usa en modal "Process"
import { teamColumns } from "./columns";
import type { TeamRow } from "./types";
import type { SortDescriptor, Key } from "@react-types/shared";
import CountryFlag from "@/components/common/CountryFlag";
import ClientDate from "@/components/common/ClientDate";

type SortDir = "ascending" | "descending";

const statusColorMap: Record<TeamRow["status"], "success" | "warning" | "danger"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

export default function TeamsTableUI({ items: initialItems }: { items: TeamRow[] }) {
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
              <div className="text-xs text-neutral-500 truncate">{t.slug ?? "—"}</div>
            </div>
          </div>
        );
      }

      case "country":
        return (
          <span className="truncate block">
            <span className="inline-flex items-center gap-1">
              <CountryFlag
                code={(t as any).country_code ?? undefined}
                title={t.country ?? (t as any).country_code ?? undefined}
                size={16}
              />
              <span className="truncate">{t.country ?? "—"}</span>
            </span>
          </span>
        );

      case "category":
        return <span className="truncate block">{t.category ?? "—"}</span>;

      case "status":
        return <Chip size="sm" color={statusColorMap[t.status]} variant="flat" className="capitalize">{t.status}</Chip>;

      case "created_at":
        return <ClientDate iso={t.created_at} />;

      case "actions":
        return (
          <div className="flex justify-end gap-2">
            {t.status === "pending" ? (
              <Tooltip content="Process team request">
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
                <Tooltip content="Team details">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    startContent={<Eye className="size-4" />}
                    onPress={() => setModal({ kind: "details", id: t.id })}
                  >
                    
                  </Button>
                </Tooltip>
                <Tooltip content="Edit team">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    startContent={<Pencil className="size-4" />}
                    onPress={() => setModal({ kind: "edit", id: t.id })}
                  >
                    
                  </Button>
                </Tooltip>
                <Tooltip color="danger" content="Delete team (disabled)">
                  <Button
                    isIconOnly
                    size="sm"
                    color="danger"
                    variant="light"
                    startContent={<Trash2 className="size-4" />}
                    isDisabled
                  >
                    
                  </Button>
                </Tooltip>
              </>
            )}
          </div>
        );

      default:
        return (t as any)[columnKey as keyof TeamRow] ?? "—";
    }
  }, []);

  return (
    <>
      <Table
        aria-label="Equipos"
        sortDescriptor={sort}
        onSortChange={onSortChange}
        removeWrapper
        classNames={{ table: "table-fixed w-full" }}
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

      {/* Modal: Process (pendiente) → tarjeta de aprobación/meta */}
      <Modal
        isOpen={modal.kind === "review" && !!openItem}
        onClose={() => setModal({ kind: null, id: null })}
        size="3xl"
        backdrop="blur"
        scrollBehavior="inside"
      >
        <ModalContent>
          {() => (
            <ModalBody className="p-0">
              {openItem ? (
                <div className="p-4">
                  <TeamAdminCard
                    team={{
                      id: openItem.id,
                      name: openItem.name,
                      slug: openItem.slug,
                      country: openItem.country,
                      crest_url: openItem.crest_url,
                      requested_by_user_id: null,
                      requested_in_application_id: openItem.requested_in_application_id,
                      tags: null,
                      alt_names: null,
                      created_at: openItem.created_at,
                      status: "pending",
                      category: openItem.category,
                      transfermarkt_url: openItem.transfermarkt_url,
                    } as any}
                  />
                </div>
              ) : null}
            </ModalBody>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: Details */}
      <Modal
        isOpen={modal.kind === "details" && !!openItem}
        onClose={() => setModal({ kind: null, id: null })}
        size="md"
        backdrop="blur"
      >
        <ModalContent>
          {() => (
            <ModalBody className="p-6">
              {openItem && (
                <div className="grid gap-3">
                  <div className="flex items-center gap-3">
                    <TeamCrest
                      src={
                        openItem.crest_url
                          ? `${openItem.crest_url}?v=${Date.parse(openItem.updated_at ?? "") || 0}`
                          : null
                      }
                      size={44}
                    />
                    <div>
                      <div className="font-semibold">{openItem.name}</div>
                      <div className="text-xs text-neutral-500">{openItem.slug ?? "—"}</div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div><b>Country:</b> {openItem.country ?? "—"}</div>
                    <div><b>Division:</b> {openItem.category ?? "—"}</div>
                    <div>
                      <b>Status:</b>{" "}
                      <Chip size="sm" variant="flat" color={statusColorMap[openItem.status]} className="capitalize">
                        {openItem.status}
                      </Chip>
                    </div>
                    <div><b>Created:</b> <ClientDate iso={openItem.created_at} /></div>
                    {openItem.transfermarkt_url && (
                      <div><b>TM:</b> <a className="underline" href={openItem.transfermarkt_url} target="_blank">link</a></div>
                    )}
                  </div>
                </div>
              )}
            </ModalBody>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: Edit (stub) */}
      <Modal
        isOpen={modal.kind === "edit" && !!openItem}
        onClose={() => setModal({ kind: null, id: null })}
        size="md"
        backdrop="blur"
      >
        <ModalContent>
          {() => (
            <ModalBody className="p-6">
              <h3 className="text-lg font-semibold mb-2">Edit team (coming soon)</h3>
              <p className="text-sm text-neutral-500">
                Pronto habilitaremos edición completa para equipos aprobados.
              </p>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
