import { z } from "zod";

import type { TaskProfileSnapshot } from "./task-context";

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

export type TaskApplicationSnapshot = {
  full_name?: string | null;
  nationality?: string[] | null;
  positions?: string[] | null;
  current_club?: string | null;
  notes?: string | null;
};

function normalizeStringArray(value: string[] | string | null | undefined): string[] | null {
  if (Array.isArray(value)) {
    return value.length > 0 ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : null;
  }

  return null;
}

export function hydrateTaskProfileSnapshot(
  profile: TaskProfileSnapshot | null,
  application: TaskApplicationSnapshot | null,
): TaskProfileSnapshot | null {
  if (!profile) return null;

  const notes = parseApplicationNotes(application?.notes ?? null);

  const birthDate = pickFirstPresent<string | null>(
    profile.birth_date,
    coerceNotesDate(notes?.birth_date),
  );

  const nationality =
    normalizeStringArray(profile.nationality) ??
    normalizeStringArray(application?.nationality) ??
    normalizeStringArray(notes?.nationality_codes);

  const positions =
    normalizeStringArray(profile.positions) ?? normalizeStringArray(application?.positions);

  const currentClub = pickFirstPresent<string | null>(profile.current_club, application?.current_club);
  const fullName = pickFirstPresent<string | null>(profile.full_name, application?.full_name);

  const heightCm = profile.height_cm ?? coerceNotesNumber(notes?.height_cm);
  const weightKg = profile.weight_kg ?? coerceNotesNumber(notes?.weight_kg);

  return {
    ...profile,
    full_name: fullName,
    birth_date: birthDate,
    nationality: nationality ?? null,
    positions: positions ?? null,
    current_club: currentClub ?? null,
    height_cm: heightCm ?? null,
    weight_kg: weightKg ?? null,
  } satisfies TaskProfileSnapshot;
}
