import { z } from "zod";

export const LINK_KINDS = [
  "highlight",
  "transfermarkt",
  "besoccer",
  "youtube",
  "instagram",
  "linkedin",
  "custom",
] as const;

export type LinkKind = (typeof LINK_KINDS)[number];

export const linkMutationSchema = z.object({
  id: z.string().uuid({ message: "El identificador es inválido." }).optional(),
  playerId: z.string().uuid({ message: "Jugador no reconocido." }),
  label: z
    .union([z.string().trim().max(120, "Máximo 120 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .nullable(),
  url: z
    .string({ required_error: "Ingresá una URL válida." })
    .trim()
    .url({ message: "Ingresá una URL válida." }),
  kind: z.enum(LINK_KINDS, {
    errorMap: () => ({ message: "Seleccioná un tipo de enlace." }),
  }),
  isPrimary: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});

export type LinkMutationInput = z.infer<typeof linkMutationSchema>;

export const honourMutationSchema = z.object({
  id: z.string().uuid({ message: "El identificador es inválido." }).optional(),
  playerId: z.string().uuid({ message: "Jugador no reconocido." }),
  title: z
    .string({ required_error: "Ingresá un título." })
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres."),
  competition: z
    .union([z.string().trim().max(120, "Máximo 120 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .nullable(),
  season: z
    .union([z.string().trim().max(32, "Máximo 32 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .nullable(),
  awardedOn: z
    .union([z.string().trim(), z.literal(""), z.null(), z.undefined()])
    .transform((value, ctx) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (trimmed.length === 0) return null;
      const date = new Date(trimmed);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ingresá una fecha válida.",
        });
        return z.NEVER;
      }
      return trimmed;
    })
    .nullable(),
  description: z
    .union([z.string().trim().max(280, "Máximo 280 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .nullable(),
});

export type HonourMutationInput = z.infer<typeof honourMutationSchema>;

const numericField = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return Number.isNaN(value) ? null : value;
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const numeric = Number(trimmed.replace(/,/g, "."));
    return Number.isNaN(numeric) ? NaN : numeric;
  })
  .refine((value) => value === null || (!Number.isNaN(value) && value >= 0), {
    message: "Ingresá un número válido mayor o igual a 0.",
  })
  .nullable();

export const seasonStatMutationSchema = z.object({
  id: z.string().uuid({ message: "El identificador es inválido." }).optional(),
  playerId: z.string().uuid({ message: "Jugador no reconocido." }),
  season: z
    .string({ required_error: "Indicá la temporada." })
    .trim()
    .min(3, "La temporada debe tener al menos 3 caracteres."),
  competition: z
    .union([z.string().trim().max(120, "Máximo 120 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .nullable(),
  team: z
    .union([z.string().trim().max(120, "Máximo 120 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .nullable(),
  matches: numericField,
  minutes: numericField,
  goals: numericField,
  assists: numericField,
  yellowCards: numericField,
  redCards: numericField,
});

export type SeasonStatMutationInput = z.infer<typeof seasonStatMutationSchema>;
