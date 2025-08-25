// src/lib/format.ts

/**
 * Formatea un valor de mercado (EUR) en notación compacta:
 *  - 950  -> "950€"
 *  - 14_000 -> "14k€"
 *  - 1_400_000 -> "1.4M€"
 *  - 1_200_000_000 -> "1.2B€"
 * Si es null/undefined, devuelve "—" (configurable).
 */
export function formatMarketValueEUR(
    input: number | string | null | undefined,
    opts: { dashOnNull?: boolean; maxFractionDigits?: 1 | 0 } = {}
  ): string {
    const { dashOnNull = true, maxFractionDigits = 1 } = opts;
  
    if (input == null) return dashOnNull ? "—" : "";
    const n = typeof input === "string" ? Number(input) : input;
    if (!isFinite(n)) return dashOnNull ? "—" : "";
  
    const abs = Math.abs(n);
  
    // < 1k → número "normal"
    if (abs < 1_000) {
      return `${Math.round(n)}€`;
    }
  
    // miles
    if (abs < 1_000_000) {
      const v = n / 1_000;
      return `${toFixedMax(v, maxFractionDigits)}k€`;
    }
  
    // millones
    if (abs < 1_000_000_000) {
      const v = n / 1_000_000;
      return `${toFixedMax(v, maxFractionDigits)}M€`;
    }
  
    // miles de millones
    const v = n / 1_000_000_000;
    return `${toFixedMax(v, maxFractionDigits)}B€`;
  }
  
  function toFixedMax(v: number, maxDigits: number) {
    // 14.0 -> "14" | 14.6 -> "14.6"
    const rounded = Number(v.toFixed(maxDigits));
    return (maxDigits > 0 && Math.abs(rounded - Math.trunc(rounded)) > 0)
      ? rounded.toString()
      : Math.trunc(rounded).toString();
  }
  