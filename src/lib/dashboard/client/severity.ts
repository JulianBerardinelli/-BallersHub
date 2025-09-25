import type { TaskSeverity } from "./tasks";

export const TASK_SEVERITY_META: Record<
  TaskSeverity,
  {
    label: string;
    chipColor: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  }
> = {
  danger: { label: "Crítico", chipColor: "danger" },
  warning: { label: "Prioritario", chipColor: "warning" },
  secondary: { label: "Recomendado", chipColor: "secondary" },
};

export function getTaskSeverityLabel(severity: TaskSeverity): string {
  return TASK_SEVERITY_META[severity]?.label ?? severity;
}
