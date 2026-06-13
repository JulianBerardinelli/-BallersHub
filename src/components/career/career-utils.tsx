export type Year = number | null;

// Normaliza y autocorrige si el 'desde' vino mayor al 'hasta'
export function normalizeRange(start: Year, end: Year) {
  const s = start ?? null;
  const e = end ?? null;
  if (s && e && s > e) return { start: e, end: s };
  return { start: s, end: e };
}

// Solapamiento con frontera EXCLUSIVA:
//  - NO solapa si aEnd <= bStart  ó  bEnd <= aStart
//  - end "abierto" (null) se considera +∞
//  - start "abierto" (null) se considera -∞
export function rangesOverlap(aS: Year, aE: Year, bS: Year, bE: Year) {
  const aStart = aS ?? Number.NEGATIVE_INFINITY;
  const aEnd   = aE ?? Number.POSITIVE_INFINITY;
  const bStart = bS ?? Number.NEGATIVE_INFINITY;
  const bEnd   = bE ?? Number.POSITIVE_INFINITY;

  const noOverlap = (aEnd <= bStart) || (bEnd <= aStart);
  return !noOverlap;
}

// Orden: más reciente arriba (end null = vigente)
export function sortCareer<T extends { start_year?: Year; end_year?: Year }>(rows: T[]) {
  const INF = 99999; // end null = súper reciente
  return [...rows].sort((a, b) => {
    const aEnd = a.end_year ?? INF;
    const bEnd = b.end_year ?? INF;
    if (aEnd !== bEnd) return bEnd - aEnd;
    const aStart = a.start_year ?? aEnd;
    const bStart = b.start_year ?? bEnd;
    return bStart - aStart;
  });
}

export const YEAR_MIN = 1950;
export const YEAR_MAX = new Date().getFullYear() + 1;

// Discriminated codes so callers can translate via t() and identify which
// year (start/end) is invalid without sniffing localized strings.
export type YearValidationCode =
  | "atLeastOneYear"
  | "startOutOfRange"
  | "endOutOfRange"
  | "startAfterEnd";

export type YearValidationIssue = {
  code: YearValidationCode;
  /** Indicates which year input the issue refers to, when applicable. */
  field?: "start" | "end" | "both";
};

export function validateYears(start?: Year, end?: Year): YearValidationIssue[] {
  const issues: YearValidationIssue[] = [];
  if (!start && !end) issues.push({ code: "atLeastOneYear", field: "both" });
  if (start && (start < YEAR_MIN || start > YEAR_MAX)) {
    issues.push({ code: "startOutOfRange", field: "start" });
  }
  if (end && (end < YEAR_MIN || end > YEAR_MAX)) {
    issues.push({ code: "endOutOfRange", field: "end" });
  }
  if (start && end && start > end) {
    issues.push({ code: "startAfterEnd", field: "start" });
  }
  return issues;
}
