"use client";

import * as React from "react";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import CareerRowEditor, { type RowDraft } from "./CareerRowEditor";
import CareerRowRead from "./CareerRowRead";
import { rangesOverlap, sortCareer } from "./career-utils";

import { bhButtonClass } from "@/components/ui/BhButton";
import { bhModalClassNames } from "@/lib/ui/heroui-brand";

export type CareerItemInput = RowDraft & { confirmed?: boolean };

export default function CareerEditor({
  items,
  onChange,
  optional = true,
  onRequestRemoveCurrent,
  showCurrentToggle = true,
  onRequestCurrentChange,
  readOnly = false,
}: {
  items: CareerItemInput[];
  onChange: (rows: CareerItemInput[]) => void;
  optional?: boolean;
  onRequestRemoveCurrent?: () => void;
  showCurrentToggle?: boolean;
  onRequestCurrentChange?: (row: CareerItemInput, selected: boolean) => boolean;
  readOnly?: boolean;
}) {
  const [skipped, setSkipped] = React.useState(false);

  // Modal de confirmación para eliminar “current”
  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  function addRow() {
    if (readOnly) return;
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
    if (readOnly) return;
    onChange(items.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: string) {
    if (readOnly) return;
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
    if (readOnly) return;
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
      <div className="rounded-bh-lg border border-dashed border-white/[0.08] bg-bh-surface-1/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-bh-fg-3">Dejaste la trayectoria para más adelante.</p>
          <Button
            size="sm"
            variant="flat"
            onPress={() => setSkipped(false)}
            className={bhButtonClass({ variant: "outline", size: "sm" })}
          >
            Editar trayectoria
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
            Trayectoria
          </h3>
          <p className="text-[12px] text-bh-fg-3">
            Agregá tus etapas por club, división y años.
          </p>
        </div>
        {optional && (
          <Button
            size="sm"
            variant="flat"
            onPress={() => setSkipped(true)}
            className={bhButtonClass({ variant: "ghost", size: "sm" })}
          >
            Completar más adelante
          </Button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {items.map((row) => (
          <motion.div key={row.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
            {row.confirmed || readOnly ? (
              <CareerRowRead
                club={row.club}
                division={row.division}
                start_year={row.start_year}
                end_year={row.end_year}
                teamMeta={row.team_meta ?? null}
                proposedCountry={row.proposed?.country ?? null}
                isCurrent={row.source === "current"} // 👈 NUEVO
                onEdit={readOnly ? undefined : () => patchRow(row.id, { confirmed: false })}
                onEditProposed={
                  readOnly || row.team_meta
                    ? undefined
                    : () => patchRow(row.id, { confirmed: false })
                }
                onRemove={
                  readOnly ? undefined : () => handleRemove(row)
                } // 👈 siempre permitimos, con confirm si “current”
                readOnly={readOnly}
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
                showCurrentToggle={showCurrentToggle && !readOnly}
                onRequestCurrentChange={(selected) =>
                  onRequestCurrentChange ? onRequestCurrentChange(row, selected) : true
                }
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {readOnly ? null : (
        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            onPress={addRow}
            startContent={<Plus className="h-4 w-4" />}
            className={bhButtonClass({ variant: "lime", size: "sm" })}
          >
            Agregar etapa
          </Button>
        </div>
      )}

      {/* Modal confirmación para borrar etapa ligada al "Club actual" */}
      <Modal
        isOpen={!readOnly && !!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        size="sm"
        classNames={bhModalClassNames}
      >
        <ModalContent>
          <ModalHeader>Eliminar etapa y club actual</ModalHeader>
          <ModalBody>
            <p className="text-sm leading-[1.55] text-bh-fg-3">
              Esta etapa está vinculada al{" "}
              <strong className="text-bh-fg-1">Club actual</strong>. Si la
              eliminás, también se limpiará la selección de club actual.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={() => setConfirmId(null)}
              className={bhButtonClass({ variant: "ghost", size: "sm" })}
            >
              Cancelar
            </Button>
            <Button
              onPress={doConfirmDelete}
              className={bhButtonClass({ variant: "danger", size: "sm" })}
            >
              Eliminar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
