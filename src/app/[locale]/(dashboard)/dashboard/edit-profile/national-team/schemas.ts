import { z } from "zod";

// Validación de una etapa de Selección Nacional. Espeja el estilo de
// football-data/schemas.ts (transforms tolerantes, años validados).

const CURRENT_YEAR = new Date().getFullYear();

const yearField = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Año inválido." });
      return z.NEVER;
    }
    if (n < 1900 || n > CURRENT_YEAR + 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `El año debe estar entre 1900 y ${CURRENT_YEAR + 1}.`,
      });
      return z.NEVER;
    }
    return n;
  })
  .nullable();

const optionalCount = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valor inválido." });
      return z.NEVER;
    }
    return n;
  })
  .nullable();

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max, `Máximo ${max} caracteres.`), z.literal(""), z.null(), z.undefined()])
    .transform((v) => {
      if (!v) return null;
      const t = v.trim();
      return t.length === 0 ? null : t;
    })
    .nullable();

export const NT_AGE_CATEGORIES = [
  "sub15",
  "sub16",
  "sub17",
  "sub18",
  "sub19",
  "sub20",
  "sub21",
  "sub23",
  "olympic",
  "senior",
  "other",
] as const;

export const NT_PARTICIPATION_TYPES = ["called_up", "played", "sparring", "training_camp"] as const;

export const nationalTeamStintInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    // Selección ya catalogada (teams.kind='national'); opcional.
    teamId: z
      .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
      .transform((v) => (v ? v : null))
      .nullable(),
    // Fallback cuando no hay team catalogado: país + nombre libre.
    proposedTeamName: optionalText(120),
    countryCode: z
      .union([z.string().length(2), z.literal(""), z.null(), z.undefined()])
      .transform((v) => (v ? v.toUpperCase() : null))
      .nullable(),
    ageCategory: z.enum(NT_AGE_CATEGORIES, { message: "Elegí la categoría." }),
    participation: z.enum(NT_PARTICIPATION_TYPES, { message: "Elegí el tipo de participación." }),
    highlights: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
    startYear: yearField,
    endYear: yearField,
    description: optionalText(600),
    caps: optionalCount,
    goals: optionalCount,
    assists: optionalCount,
    minutes: optionalCount,
    referenceUrl: z
      .union([z.string().trim(), z.null(), z.undefined()])
      .transform((v, ctx) => {
        if (!v) return null;
        const t = v.trim();
        if (!t) return null;
        if (!/^https?:\/\/[^ "<>]+$/i.test(t)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ingresá una URL válida (http/https)." });
          return z.NEVER;
        }
        return t;
      })
      .nullable(),
  })
  .refine((d) => Boolean(d.teamId) || Boolean(d.countryCode), {
    message: "Elegí el país de la selección.",
    path: ["countryCode"],
  })
  .refine((d) => d.endYear == null || d.startYear == null || d.endYear >= d.startYear, {
    message: "El año de fin no puede ser anterior al de inicio.",
    path: ["endYear"],
  });

export const upsertNationalTeamStintSchema = z.object({
  playerId: z.string().uuid({ message: "Jugador no reconocido." }),
  stint: nationalTeamStintInputSchema,
});

export const deleteNationalTeamStintSchema = z.object({
  playerId: z.string().uuid(),
  id: z.string().uuid(),
});

export const reorderNationalTeamStintsSchema = z.object({
  playerId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1).max(50),
});

export type NationalTeamStintInput = z.input<typeof nationalTeamStintInputSchema>;
export type UpsertNationalTeamStintInput = z.input<typeof upsertNationalTeamStintSchema>;
