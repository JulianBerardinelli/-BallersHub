"use client";

import * as React from "react";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import CareerRowEditor, { type RowDraft } from "./CareerRowEditor";
import CareerRowRead from "./CareerRowRead";
import { rangesOverlap, sortCareer } from "./career-utils";

export type CareerItemInput = RowDraft & { confirmed?: boolean };

export default function CareerEditor({
  items,
  onChange,
  optional = true,
  onRequestRemoveCurrent,                  // 👈 NUEVO
}: {
  items: CareerItemInput[];
  onChange: (rows: CareerItemInput[]) => void;
  optional?: boolean;
  onRequestRemoveCurrent?: () => void;     // 👈 NUEVO
}) {
  const [skipped, setSkipped] = React.useState(false);

  // Modal de confirmación para eliminar “current”
  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  function addRow() {
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        club: "",
        division: null,
        start_year: null,
        end_year: null,
        team_id: null,
        team_meta: null,
        proposed: null,
        confirmed: false,
        source: "manual",
      },
    ]);
  }

  function patchRow(id: string, patch: Partial<CareerItemInput>) {
    onChange(items.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: string) {
    onChange(items.filter((r) => r.id !== id));
  }

  function overlapMsg(row: CareerItemInput): string | null {
    const others = items.filter((r) => r.id !== row.id && r.confirmed);
    for (const o of others) {
      if (rangesOverlap(row.start_year ?? null, row.end_year ?? null, o.start_year ?? null, o.end_year ?? null)) {
        return `Solapado con ${o.club} (${o.start_year ?? "?"}–${o.end_year ?? "Actual"})`;
      }
    }
    return null;
  }

  function confirmRow(id: string) {
    const row = items.find((r) => r.id === id);
    if (!row) return;
    const warn = overlapMsg(row);
    if (warn) return;

    const next = items.map((r) => (r.id === id ? { ...r, confirmed: true } : r));
    const confirmed = sortCareer(next.filter((r) => r.confirmed));
    const editing   = next.filter((r) => !r.confirmed);
    onChange([...confirmed, ...editing]);
  }

  // Handler de eliminación, con confirm para “current”
  function handleRemove(row: CareerItemInput) {
    if (row.source === "current") {
      setConfirmId(row.id);
    } else {
      removeRow(row.id);
    }
  }

  function doConfirmDelete() {
    if (!confirmId) return;
    const row = items.find((r) => r.id === confirmId);
    setConfirmId(null);
    if (!row) return;
    // Eliminamos la fila
    removeRow(row.id);
    // Pedimos limpiar el “Club actual” del picker de arriba
    onRequestRemoveCurrent?.();
  }

  if (optional && skipped) {
    return (
      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground-500">Dejaste la trayectoria para más adelante.</p>
          <Button size="sm" variant="flat" onPress={() => setSkipped(false)}>Editar trayectoria</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium">Trayectoria</h3>
          <p className="text-sm text-foreground-500">Agregá tus etapas por club, división y años.</p>
        </div>
        {optional && (
          <Button size="sm" variant="flat" onPress={() => setSkipped(true)}>
            Completar más adelante
          </Button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {items.map((row) => (
          <motion.div key={row.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
            {row.confirmed ? (
              <CareerRowRead
                club={row.club}
                division={row.division}
                start_year={row.start_year}
                end_year={row.end_year}
                teamMeta={row.team_meta ?? null}
                proposedCountry={row.proposed?.country ?? null}
                isCurrent={row.source === "current"}             // 👈 NUEVO
                onEdit={() => patchRow(row.id, { confirmed: false })}
                onEditProposed={!row.team_meta ? () => patchRow(row.id, { confirmed: false }) : undefined}
                onRemove={() => handleRemove(row)}               // 👈 siempre permitimos, con confirm si “current”
              />
            ) : (
              <CareerRowEditor
                value={row}
                onPatch={(p) => patchRow(row.id, p)}
                onConfirm={() => confirmRow(row.id)}
                onCancel={() => {
                  // Si es current y está “ligado”, no permitir cancelar
                  if (row.source === "current") return;
                  // Si está vacío, lo saco; si no, lo dejo
                  if (!row.club && !row.start_year && !row.end_year) removeRow(row.id);
                }}
                onRemove={() => {
                  if (row.source === "current") setConfirmId(row.id); else removeRow(row.id);
                }}
                overlapError={overlapMsg(row)}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="flex justify-end">
        <Button size="sm" onPress={addRow}>Agregar etapa</Button>
      </div>

      {/* Modal confirmación para borrar etapa ligada al “Club actual” */}
      <Modal isOpen={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)} size="sm">
        <ModalContent>
          <ModalHeader>Eliminar etapa y club actual</ModalHeader>
          <ModalBody>
            <p className="text-sm text-foreground-600">
              Esta etapa está vinculada al <b>Club actual</b>. Si la eliminás, también se limpiará la selección de club actual.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setConfirmId(null)}>Cancelar</Button>
            <Button color="danger" onPress={doConfirmDelete}>Eliminar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
