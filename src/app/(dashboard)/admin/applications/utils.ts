export const birthDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function formatBirthDate(value: string | null) {
  if (!value) return "—";
  try {
    const iso = value.length <= 10 ? `${value}T00:00:00` : value;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return birthDateFormatter.format(date);
  } catch {
    return "—";
  }
}

export function formatYearRange(start: number | null, end: number | null) {
  const startLabel = start ?? "—";
  const endLabel = end ?? "…";
  return `${startLabel}–${endLabel}`;
}

type ChipStyle = "default" | "success" | "warning" | "primary" | "danger";

export const careerStatusMeta: Record<string, { label: string; color: ChipStyle }> = {
  accepted: { label: "Aprobada", color: "success" },
  approved: { label: "Aprobada", color: "success" },
  waiting: { label: "Esperando equipo", color: "primary" },
  pending: { label: "Pendiente", color: "default" },
  draft: { label: "Borrador", color: "default" },
  rejected: { label: "Rechazada", color: "danger" },
};

export const teamStatusMeta: Record<string, { label: string; color: ChipStyle }> = {
  pending: { label: "Equipo pendiente", color: "warning" },
  approved: { label: "Equipo aprobado", color: "success" },
  rejected: { label: "Equipo rechazado", color: "danger" },
};
