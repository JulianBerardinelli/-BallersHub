import { z } from "zod";

export type ParsedApplicationNotes = {
  birth_date?: unknown;
  height_cm?: unknown;
  weight_kg?: unknown;
  nationality_codes?: string[];
  social_url?: string | null;
};

const applicationNotesSchema = z
  .object({
    birth_date: z.unknown().optional(),
    height_cm: z.union([z.number(), z.string(), z.null()]).optional(),
    weight_kg: z.union([z.number(), z.string(), z.null()]).optional(),
    nationality_codes: z.array(z.string()).optional(),
    social_url: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();

export function parseApplicationNotes(notes: string | null): ParsedApplicationNotes | null {
  if (!notes) return null;

  try {
    const raw = JSON.parse(notes);
    const parsed = applicationNotesSchema.safeParse(raw);
    if (!parsed.success) return null;
    return parsed.data as ParsedApplicationNotes;
  } catch {
    return null;
  }
}

export function coerceNotesNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

export function coerceNotesDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.value === "string") return record.value;
    if (typeof record.iso === "string") return record.iso;
    if (
      typeof record.year === "number" &&
      typeof record.month === "number" &&
      typeof record.day === "number"
    ) {
      const month = String(record.month).padStart(2, "0");
      const day = String(record.day).padStart(2, "0");
      return `${record.year}-${month}-${day}`;
    }
  }
  return null;
}

export function pickFirstPresent<T>(
  ...values: Array<T | null | undefined>
): T | null {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string") {
      if (value.trim().length === 0) continue;
      return value as T;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      return value as T;
    }
    return value as T;
  }
  return null;
}

function sanitizeUrl(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pickMatchingUrl(urls: Array<string | null | undefined>, pattern: RegExp): string | null {
  for (const url of urls) {
    if (typeof url === "string" && pattern.test(url)) {
      return url;
    }
  }
  return null;
}

export type ApplicationLinks = {
  transfermarkt: string | null;
  besoccer: string | null;
  social: string | null;
  youtube: string | null;
  instagram: string | null;
  linkedin: string | null;
};

export function extractApplicationLinks(application: {
  transfermarkt_url?: string | null;
  external_profile_url?: string | null;
  notes?: string | null;
} | null): ApplicationLinks {
  const notes = parseApplicationNotes(application?.notes ?? null);
  const transfermarkt = sanitizeUrl(application?.transfermarkt_url ?? null);
  const external = sanitizeUrl(application?.external_profile_url ?? null);
  const socialFromNotes = sanitizeUrl(notes?.social_url ?? null);

  let besoccer: string | null = null;
  let fallbackSocial: string | null = null;

  if (external) {
    if (/besoccer/i.test(external)) {
      besoccer = external;
    } else {
      fallbackSocial = external;
    }
  }

  const candidateSocials = [socialFromNotes, fallbackSocial];

  const social = pickFirstPresent<string | null>(...candidateSocials) ?? null;
  const youtube = pickMatchingUrl(candidateSocials, /youtu\.be|youtube\.com/i);
  const instagram = pickMatchingUrl(candidateSocials, /instagram\.com/i);
  const linkedin = pickMatchingUrl(candidateSocials, /linkedin\.com/i);

  return {
    transfermarkt,
    besoccer,
    social,
    youtube,
    instagram,
    linkedin,
  };
}
