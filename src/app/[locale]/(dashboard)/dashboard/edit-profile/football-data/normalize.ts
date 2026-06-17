// Pure normalizers shared by the player-facing football-data actions and the
// admin player CRUD actions. Framework-free (no "use server") so both
// server-action modules can import the same logic — in particular
// parseMarketValue, whose string/precision handling must not drift.

export type ChangeLogEntry = { field: string; oldValue: unknown; newValue: unknown };

export function sanitizeText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function formatPositions(positions: string[] | null | undefined): string {
  if (!Array.isArray(positions) || positions.length === 0) return "";
  return positions
    .map((position) => sanitizeText(position) ?? null)
    .filter((position): position is string => Boolean(position))
    .join(", ");
}

export function parseMarketValue(
  value: string | null | undefined,
): { dbValue: string | null; display: string; error?: string } {
  const sanitized = sanitizeText(value);
  if (!sanitized) {
    return { dbValue: null, display: "" };
  }

  const stripped = sanitized.replace(/[^0-9.,]/g, "").replace(/\s+/g, "");
  if (!stripped) {
    return { dbValue: null, display: "", error: "Ingresá un valor numérico válido." };
  }

  const lastComma = stripped.lastIndexOf(",");
  const lastDot = stripped.lastIndexOf(".");
  let normalized = stripped;

  if (lastComma > lastDot) {
    const integerPart = stripped.slice(0, lastComma).replace(/[^0-9]/g, "");
    const decimalPart = stripped.slice(lastComma + 1).replace(/[^0-9]/g, "");
    normalized = decimalPart ? `${integerPart}.${decimalPart.slice(0, 2)}` : integerPart;
  } else if (lastDot > lastComma) {
    const integerPart = stripped.slice(0, lastDot).replace(/[^0-9]/g, "");
    const decimalPart = stripped.slice(lastDot + 1).replace(/[^0-9]/g, "");
    normalized = decimalPart ? `${integerPart}.${decimalPart.slice(0, 2)}` : integerPart;
  } else {
    normalized = stripped.replace(/[^0-9]/g, "");
  }

  if (!normalized) {
    return { dbValue: null, display: "", error: "Ingresá un valor numérico válido." };
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return { dbValue: null, display: "", error: "Ingresá un valor numérico válido." };
  }

  if (numeric < 0) {
    return { dbValue: null, display: "", error: "El valor no puede ser negativo." };
  }

  const dbValue = numeric.toFixed(2);
  const display = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(numeric);
  return { dbValue, display };
}
