"use client";

import { useOptimistic, useTransition } from "react";
import { updateSectionVisibilityAction } from "@/app/actions/template-settings";
import { useNotificationContext, profileNotification } from "@/modules/notifications";
import { Switch } from "@heroui/react";

type OptimisticStructureBlock = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

export default function StructureManagerClient({
  initialBlocks,
}: {
  initialBlocks: OptimisticStructureBlock[];
}) {
  const { enqueue } = useNotificationContext();
  const [isPending, startTransition] = useTransition();

  const [blocks, updateBlockOptimistic] = useOptimistic(
    initialBlocks,
    (state, updatedBlock: { id: string; enabled: boolean }) =>
      state.map((b) => (b.id === updatedBlock.id ? { ...b, enabled: updatedBlock.enabled } : b))
  );

  const handleToggle = (id: string, newEnabled: boolean) => {
    startTransition(async () => {
      updateBlockOptimistic({ id, enabled: newEnabled });
      try {
        await updateSectionVisibilityAction({ section: id, visible: newEnabled });
        enqueue(
          profileNotification.updated({
            userName: "Sección",
            sectionLabel: "Estructura",
            changedFields: [id],
          })
        );
      } catch (err) {
        console.error("Fallo al actualizar seccion", err);
        // Error state shouldn't strictly revert immediately here without another refetch, 
        // but for MVP it's sufficient notification
        alert("Ocurrió un error al intentar cambiar la visibilidad.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <label
          key={block.id}
          className="flex items-start justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-950/40 p-5 transition-colors hover:border-neutral-700 cursor-pointer"
        >
          <div>
            <p className="text-sm font-semibold text-white">{block.label}</p>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{block.description}</p>
          </div>
          <div className="pt-1">
            <Switch
              size="md"
              isSelected={block.enabled}
              onValueChange={(isSelected) => handleToggle(block.id, isSelected)}
              color="primary"
              aria-label={block.label}
            />
          </div>
        </label>
      ))}
    </div>
  );
}
