"use client";

import { Chip } from "@heroui/react";
import { TASK_SEVERITY_META } from "@/lib/dashboard/client/severity";
import type { TaskSeverity } from "@/lib/dashboard/client/tasks";

export default function TaskSeverityChip({ severity }: { severity: TaskSeverity }) {
  const meta = TASK_SEVERITY_META[severity];

  return (
    <Chip color={meta.chipColor} variant="flat" size="sm" className="font-semibold uppercase tracking-wide">
      {meta.label}
    </Chip>
  );
}
