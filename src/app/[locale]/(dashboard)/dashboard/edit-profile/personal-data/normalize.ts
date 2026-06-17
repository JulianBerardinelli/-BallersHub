// Pure parsing/normalization helpers for the personal-data forms (basic info +
// contact). Shared by the player-facing actions and the admin player CRUD so
// the country/residence/document/measurement parsing stays identical for both.
// Framework-free (no "use server") — only `fetchCountryLookup` touches a client
// and accepts it as an argument.

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

export type ChangeLogEntry = { field: string; oldValue: unknown; newValue: unknown };

export type CountryRecord = { code: string | null; name_es: string | null; name_en: string | null };
export type CountryInfo = { code: string; label: string };
export type CountryLookup = {
  byCode: Map<string, CountryInfo>;
  byName: Map<string, CountryInfo>;
};

export function mapPostgrestError(error: PostgrestError | null): string {
  if (!error) return "No fue posible completar la operación.";
  if (error.code === "42501") {
    return "No tenés permisos para modificar este perfil.";
  }
  return error.message ?? "No fue posible completar la operación.";
}

export function sanitizeText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim();
}

export function buildCountryLookup(records: CountryRecord[] | null): CountryLookup {
  const byCode = new Map<string, CountryInfo>();
  const byName = new Map<string, CountryInfo>();

  (records ?? []).forEach((country) => {
    if (!country.code) return;
    const label = country.name_es ?? country.name_en ?? country.code;
    const info: CountryInfo = { code: country.code.toUpperCase(), label };
    byCode.set(info.code, info);

    const aliases = [label, country.name_en, country.name_es, country.code];
    aliases
      .map((alias) => sanitizeText(alias))
      .filter((alias): alias is string => Boolean(alias))
      .forEach((alias) => {
        byName.set(normalizeToken(alias), info);
      });
  });

  return { byCode, byName };
}

export function resolveCountry(
  input: string | null,
  lookup: CountryLookup,
): { info: CountryInfo | null; display: string | null } {
  const sanitized = sanitizeText(input);
  if (!sanitized) return { info: null, display: null };

  const directCode = lookup.byCode.get(sanitized.toUpperCase());
  if (directCode) {
    return { info: directCode, display: directCode.label };
  }

  const normalized = normalizeToken(sanitized);
  const byName = lookup.byName.get(normalized);
  if (byName) {
    return { info: byName, display: byName.label };
  }

  return { info: null, display: sanitized };
}

export function parseBirthDate(
  value: string | null | undefined,
): { iso: string | null; display: string; error?: string } {
  const sanitized = sanitizeText(value);
  if (!sanitized) return { iso: null, display: "" };

  const ddMmYyyy = /^([0-3]?\d)\/(0?\d|1[0-2])\/(\d{4})$/;
  const yyyyMmDd = /^(\d{4})-(0?\d|1[0-2])-(0?[0-3]?\d)$/;

  if (ddMmYyyy.test(sanitized)) {
    const [, dd, mm, yyyy] = sanitized.match(ddMmYyyy)!;
    const iso = `${yyyy.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    return { iso, display: `${dd.padStart(2, "0")}/${mm.padStart(2, "0")}/${yyyy}` };
  }

  if (yyyyMmDd.test(sanitized)) {
    const [, yyyy, mm, dd] = sanitized.match(yyyyMmDd)!;
    const iso = `${yyyy.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    return { iso, display: `${dd.padStart(2, "0")}/${mm.padStart(2, "0")}/${yyyy}` };
  }

  const parsedDate = new Date(sanitized);
  if (!Number.isNaN(parsedDate.getTime())) {
    const iso = parsedDate.toISOString().slice(0, 10);
    const [year, month, day] = iso.split("-");
    return { iso, display: `${day}/${month}/${year}` };
  }

  return { iso: null, display: sanitized, error: "Ingresá una fecha válida." };
}

export function formatStoredNationalities(
  names: string[] | null | undefined,
  codes: string[] | null | undefined,
  lookup: CountryLookup,
): string {
  const tokens: string[] = [];
  const seen = new Set<string>();

  (names ?? []).forEach((name) => {
    const sanitized = sanitizeText(name);
    if (!sanitized) return;
    const normalized = sanitized;
    if (!seen.has(normalized)) {
      tokens.push(normalized);
      seen.add(normalized);
    }
  });

  (codes ?? []).forEach((code) => {
    const sanitized = sanitizeText(code);
    if (!sanitized) return;
    const normalized = sanitized.toUpperCase();
    const info = lookup.byCode.get(normalized);
    const label = info?.label ?? normalized;
    if (!seen.has(label)) {
      tokens.push(label);
      seen.add(label);
    }
  });

  return tokens.join(", ");
}

export function parseResidence(
  value: string | null | undefined,
  lookup: CountryLookup,
): {
  city: string | null;
  countryName: string | null;
  countryCode: string | null;
  display: string;
} {
  const sanitized = sanitizeText(value);
  if (!sanitized) {
    return { city: null, countryName: null, countryCode: null, display: "" };
  }

  const parts = sanitized.split(",");
  const city = sanitizeText(parts.shift() ?? null);
  const countryCandidate = sanitizeText(parts.join(","));
  const { info, display } = resolveCountry(countryCandidate, lookup);
  const countryName = display ?? null;
  const countryCode = info?.code ?? null;

  const tokens = [city, countryName].filter((token): token is string => Boolean(token));

  return { city, countryName, countryCode, display: tokens.join(", ") };
}

export function parseMeasurement(
  value: string | null | undefined,
  label: string,
  { min, max }: { min: number; max: number },
): { numeric: number | null; display: string; error?: string } {
  const sanitized = sanitizeText(value);
  if (!sanitized) {
    return { numeric: null, display: "" };
  }

  const normalized = sanitized.replace(",", ".");
  const numeric = Number(normalized);

  if (Number.isNaN(numeric)) {
    return { numeric: null, display: sanitized, error: `Ingresá un valor numérico válido para ${label.toLowerCase()}.` };
  }

  if (numeric < min || numeric > max) {
    return {
      numeric: null,
      display: sanitized,
      error: `${label} debe estar entre ${min} y ${max}.`,
    };
  }

  return { numeric, display: sanitized };
}

export function parseLanguages(
  value: string | null | undefined,
): { list: string[] | null; display: string } {
  const sanitized = sanitizeText(value);
  if (!sanitized) return { list: null, display: "" };

  const tokens = sanitized
    .split(/[,;\n]/)
    .map((token) => sanitizeText(token))
    .filter((token): token is string => Boolean(token));

  return { list: tokens.length > 0 ? tokens : null, display: tokens.join(", ") };
}

export function parseDocuments(value: string | null | undefined): {
  type: string | null;
  number: string | null;
  display: string;
} {
  const sanitized = sanitizeText(value);
  if (!sanitized) {
    return { type: null, number: null, display: "" };
  }

  const separators = ["·", "-", "|", ",", ";"];

  for (const separator of separators) {
    if (sanitized.includes(separator)) {
      const [rawType, rawNumber] = sanitized.split(separator);
      const type = sanitizeText(rawType);
      const number = sanitizeText(rawNumber);
      const tokens = [type, number].filter((token): token is string => Boolean(token));
      return { type: type ?? null, number: number ?? null, display: tokens.join(" · ") };
    }
  }

  return { type: sanitized, number: null, display: sanitized };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchCountryLookup(client: SupabaseClient<any, any, any>): Promise<CountryLookup> {
  const { data } = await client.from("countries").select("code, name_es, name_en");
  return buildCountryLookup(data as CountryRecord[] | null);
}
