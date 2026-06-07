"use client";

import { useOptimistic, useTransition } from "react";
import { updateAgencySectionVisibilityAction } from "@/app/actions/agency-template-settings";
import { useNotificationContext, profileNotification } from "@/modules/notifications";
import { Switch } from "@heroui/react";

import { bhSwitchClassNames } from "@/lib/ui/heroui-brand";

type Block = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

export default function AgencyStructureManagerClient({
  initialBlocks,
}: {
  initialBlocks: Block[];
}) {
  const { enqueue } = useNotificationContext();
  const [, startTransition] = useTransition();

  const [blocks, updateBlockOptimistic] = useOptimistic(
    initialBlocks,
    (state, updatedBlock: { id: string; enabled: boolean }) =>
      state.map((b) => (b.id === updatedBlock.id ? { ...b, enabled: updatedBlock.enabled } : b)),
  );

  const handleToggle = (id: string, newEnabled: boolean) => {
    startTransition(async () => {
      updateBlockOptimistic({ id, enabled: newEnabled });
      try {
        await updateAgencySectionVisibilityAction({ section: id, visible: newEnabled });
        enqueue(
          profileNotification.updated({
            userName: "Agencia",
            sectionLabel: "Estructura",
            changedFields: [id],
          }),
        );
      } catch (err) {
        console.error("Fallo al actualizar seccion", err);
        alert("Ocurrió un error al intentar cambiar la visibilidad.");
      }
    });
  };

  return (
    <div className="space-y-3">
      {blocks.map((block) => (
        <label
          key={block.id}
          className={`flex cursor-pointer items-start justify-between gap-4 rounded-bh-lg border p-5 transition-colors ${
            block.enabled
              ? "border-[rgba(204,255,0,0.18)] bg-[rgba(204,255,0,0.04)]"
              : "border-white/[0.08] bg-bh-surface-1/40 hover:border-white/[0.18]"
          }`}
        >
          <div>
            <p className="text-[13px] font-semibold text-bh-fg-1">{block.label}</p>
            <p className="mt-1 text-[12px] leading-[1.55] text-bh-fg-3">{block.description}</p>
          </div>
          <div className="pt-1">
            <Switch
              size="md"
              isSelected={block.enabled}
              onValueChange={(isSelected) => handleToggle(block.id, isSelected)}
              aria-label={block.label}
              classNames={bhSwitchClassNames}
            />
          </div>
        </label>
      ))}
    </div>
  );
}
